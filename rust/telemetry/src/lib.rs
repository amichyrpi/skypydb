use std::collections::HashMap;
use std::env;
use std::time::Instant;

use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry::KeyValue;
use opentelemetry_otlp::{SpanExporter, WithExportConfig, WithHttpConfig};
use opentelemetry_sdk::trace::{self, Tracer};
use opentelemetry_sdk::Resource;
use skypydb_errors::AppError;
use skypydb_metrics::capture_http_action;
use tracing::{error, info, Instrument};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Registry};

/// Initializes global tracing subscribers for structured backend logs.
pub fn init_tracing(log_level: &str) -> Result<(), AppError> {
    let filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(log_level))
        .map_err(|error| AppError::config(format!("invalid log level: {}", error)))?;

    let format_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .compact();

    if let Some(tracer) = build_posthog_tracer()? {
        let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);
        Registry::default()
            .with(filter)
            .with(format_layer)
            .with(otel_layer)
            .try_init()
            .map_err(|error| AppError::internal(format!("failed to init tracing: {}", error)))?;
        return Ok(());
    }

    Registry::default()
        .with(filter)
        .with(format_layer)
        .try_init()
        .map_err(|error| AppError::internal(format!("failed to init tracing: {}", error)))?;

    Ok(())
}

/// Telemetry middleware that traces every HTTP action and emits metrics events.
pub async fn trace_http_action(request: Request<axum::body::Body>, next: Next) -> Response {
    let method = request.method().to_string();
    let path = request.uri().path().to_string();
    let request_id = request
        .headers()
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);

    let action_type = classify_action(&method, &path);
    let request_id_value = request_id.as_deref().unwrap_or("");
    let span = tracing::info_span!(
        "http.request",
        action.type = %action_type,
        http.method = %method,
        http.path = %path,
        request.id = %request_id_value,
    );

    let start = Instant::now();
    info!(parent: &span, "request.received");

    let response = next.run(request).instrument(span.clone()).await;
    let status = response.status().as_u16();
    let duration_ms = start.elapsed().as_millis() as u64;

    if status >= 500 {
        error!(parent: &span, http.status_code = status, duration_ms, "request.failed");
    } else {
        info!(parent: &span, http.status_code = status, duration_ms, "request.completed");
    }

    capture_http_action(
        action_type,
        &method,
        &path,
        status,
        duration_ms,
        request_id.as_deref(),
    );

    response
}

fn classify_action(method: &str, path: &str) -> &'static str {
    if path.contains("/insert") || path.contains("/items/add") {
        return "addition";
    }
    if path.contains("/update") || path.contains("/delete") || path.contains("/move") {
        return "mutation";
    }
    if method == "GET"
        || path.contains("/query")
        || path.contains("/count")
        || path.contains("/first")
        || path.contains("/items/get")
    {
        return "retrieval";
    }

    "call"
}

fn build_posthog_tracer() -> Result<Option<Tracer>, AppError> {
    let endpoint = env::var("SKYPYDB_POSTHOG_OTEL_ENDPOINT").ok().or_else(|| {
        let host = env::var("SKYPYDB_POSTHOG_HOST")
            .unwrap_or_else(|_| "https://eu.i.posthog.com".to_string());
        Some(format!("{}/v1/traces", host.trim_end_matches('/')))
    });
    let api_key = env::var("SKYPYDB_POSTHOG_API_KEY").ok();

    let (Some(endpoint), Some(api_key)) = (endpoint, api_key) else {
        return Ok(None);
    };

    let mut headers = HashMap::<String, String>::new();
    headers.insert("Authorization".to_string(), format!("Bearer {}", api_key));

    let exporter = SpanExporter::builder()
        .with_http()
        .with_endpoint(endpoint)
        .with_headers(headers)
        .build()
        .map_err(|error| AppError::internal(format!("failed to build OTLP exporter: {}", error)))?;

    let service_name = env::var("SKYPYDB_SERVICE_NAME").unwrap_or_else(|_| "skypydb".to_string());
    let environment = env::var("SKYPYDB_ENVIRONMENT").unwrap_or_else(|_| "local".to_string());

    let resource = Resource::builder()
        .with_attributes(vec![
            KeyValue::new("service.name", service_name),
            KeyValue::new("deployment.environment", environment),
        ])
        .build();

    let provider = trace::SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        .with_resource(resource)
        .build();

    let tracer = provider.tracer("skypydb");
    global::set_tracer_provider(provider);

    Ok(Some(tracer))
}
