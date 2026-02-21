use axum::http::{HeaderValue, Request};
use axum::middleware::Next;
use axum::response::Response;
use uuid::Uuid;

/// Adds/propagates `x-request-id` for request correlation across logs and responses.
pub async fn attach_request_id(request: Request<axum::body::Body>, next: Next) -> Response {
    let incoming_request_id = request
        .headers()
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);

    let request_id = incoming_request_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let mut request = request;
    if let Ok(header_value) = HeaderValue::from_str(&request_id) {
        request
            .headers_mut()
            .insert("x-request-id", header_value.clone());
    }

    let mut response = next.run(request).await;
    if let Ok(header_value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert("x-request-id", header_value);
    }
    response
}
