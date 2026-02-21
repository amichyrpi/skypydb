use std::env;
use std::time::Duration;

use chrono::Utc;
use once_cell::sync::OnceCell;
use reqwest::Client;
use serde_json::{json, Map, Value};
use skypydb_errors::AppError;
use skypydb_google_cloud_utils::default_cloud_run_settings;
use tracing::{debug, info, warn};

static POSTHOG_CLIENT: OnceCell<PostHogClient> = OnceCell::new();

/// Runtime configuration for PostHog analytics capture.
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    /// Enables analytics capture.
    pub enabled: bool,
    /// PostHog project API key.
    pub api_key: Option<String>,
    /// PostHog host URL.
    pub host: String,
    /// Distinct identifier used for all backend events.
    pub distinct_id: String,
    /// Service name attached to every metrics event.
    pub service_name: String,
    /// Deployment environment attached to metrics events.
    pub environment: String,
    /// Outbound capture request timeout.
    pub request_timeout_ms: u64,
}

impl MetricsConfig {
    /// Loads PostHog metrics settings from environment variables.
    pub fn from_env() -> Self {
        let api_key = env::var("SKYPYDB_POSTHOG_API_KEY").ok();
        let enabled = env::var("SKYPYDB_POSTHOG_ENABLED")
            .ok()
            .map(|value| matches!(value.to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
            .unwrap_or_else(|| api_key.is_some());

        let host = env::var("SKYPYDB_POSTHOG_HOST")
            .unwrap_or_else(|_| "https://eu.i.posthog.com".to_string())
            .trim_end_matches('/')
            .to_string();

        let service_name = env::var("K_SERVICE")
            .ok()
            .or_else(|| env::var("SKYPYDB_SERVICE_NAME").ok())
            .unwrap_or_else(|| "skypydb".to_string());

        let distinct_id = env::var("SKYPYDB_POSTHOG_DISTINCT_ID")
            .ok()
            .or_else(|| env::var("K_REVISION").ok())
            .unwrap_or_else(|| "skypydb-backend".to_string());

        let environment = env::var("SKYPYDB_ENVIRONMENT")
            .ok()
            .or_else(|| env::var("GOOGLE_CLOUD_PROJECT").ok())
            .unwrap_or_else(|| "local".to_string());

        let request_timeout_ms = env::var("SKYPYDB_POSTHOG_TIMEOUT_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(5_000);

        Self {
            enabled,
            api_key,
            host,
            distinct_id,
            service_name,
            environment,
            request_timeout_ms,
        }
    }
}

#[derive(Clone)]
struct PostHogClient {
    http: Client,
    endpoint: String,
    api_key: String,
    distinct_id: String,
    common_properties: Map<String, Value>,
}

/// Initializes global PostHog analytics capture.
pub fn init_metrics(config: MetricsConfig) -> Result<(), AppError> {
    if !config.enabled {
        info!("PostHog metrics disabled");
        return Ok(());
    }

    let api_key = config.api_key.ok_or_else(|| {
        AppError::config("SKYPYDB_POSTHOG_API_KEY is required when metrics are enabled")
    })?;

    let http = Client::builder()
        .timeout(Duration::from_millis(config.request_timeout_ms))
        .build()
        .map_err(|error| {
            AppError::internal(format!("failed to create metrics http client: {}", error))
        })?;

    let mut common_properties = Map::<String, Value>::new();
    common_properties.insert(
        "service.name".to_string(),
        Value::String(config.service_name.clone()),
    );
    common_properties.insert(
        "deployment.environment".to_string(),
        Value::String(config.environment.clone()),
    );
    common_properties.insert(
        "library.name".to_string(),
        Value::String("skypydb".to_string()),
    );
    common_properties.insert(
        "metrics.initialized_at".to_string(),
        Value::String(Utc::now().to_rfc3339()),
    );

    for (key, value) in default_cloud_run_settings().as_properties() {
        common_properties.insert(key, value);
    }

    let client = PostHogClient {
        http,
        endpoint: format!("{}/capture/", config.host),
        api_key,
        distinct_id: config.distinct_id,
        common_properties,
    };

    if POSTHOG_CLIENT.set(client).is_err() {
        debug!("PostHog metrics already initialized; keeping existing client");
    }

    info!("PostHog metrics initialized");
    Ok(())
}

/// Captures a generic analytics event.
pub fn capture_event(event: &str, mut properties: Map<String, Value>) {
    let Some(client) = POSTHOG_CLIENT.get() else {
        return;
    };

    for (key, value) in &client.common_properties {
        properties
            .entry(key.clone())
            .or_insert_with(|| value.clone());
    }

    let payload = json!({
        "api_key": client.api_key,
        "event": event,
        "distinct_id": client.distinct_id,
        "properties": properties,
        "timestamp": Utc::now().to_rfc3339(),
    });

    let endpoint = client.endpoint.clone();
    let http = client.http.clone();

    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        handle.spawn(async move {
            match http.post(&endpoint).json(&payload).send().await {
                Ok(response) if response.status().is_success() => {}
                Ok(response) => {
                    warn!(
                        status = %response.status(),
                        "PostHog capture request failed"
                    );
                }
                Err(error) => {
                    warn!(error = %error, "PostHog capture request errored");
                }
            }
        });
    }
}

/// Captures request-level action metrics emitted by telemetry middleware.
pub fn capture_http_action(
    action: &str,
    method: &str,
    path: &str,
    status: u16,
    duration_ms: u64,
    request_id: Option<&str>,
) {
    let mut properties = Map::<String, Value>::new();
    properties.insert("action.type".to_string(), Value::String(action.to_string()));
    properties.insert("http.method".to_string(), Value::String(method.to_string()));
    properties.insert("http.path".to_string(), Value::String(path.to_string()));
    properties.insert("http.status_code".to_string(), Value::from(status));
    properties.insert("http.duration_ms".to_string(), Value::from(duration_ms));

    if let Some(request_id) = request_id {
        properties.insert(
            "request.id".to_string(),
            Value::String(request_id.to_string()),
        );
    }

    capture_event("backend_http_action", properties);
}
