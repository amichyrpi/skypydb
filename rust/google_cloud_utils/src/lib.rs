use std::env;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Cloud Run deployment metadata discovered from environment variables.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CloudRunSettings {
    /// HTTP port used by the service container.
    pub port: u16,
    /// Google Cloud project id.
    pub project_id: Option<String>,
    /// Google Cloud region.
    pub region: Option<String>,
    /// Cloud Run service name.
    pub service_name: Option<String>,
    /// Cloud Run revision name.
    pub revision: Option<String>,
    /// Cloud Run configuration name.
    pub configuration: Option<String>,
}

/// Builds Cloud Run settings from the current process environment.
pub fn default_cloud_run_settings() -> CloudRunSettings {
    CloudRunSettings {
        port: env::var("PORT")
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(8000),
        project_id: env::var("GOOGLE_CLOUD_PROJECT").ok(),
        region: env::var("GOOGLE_CLOUD_REGION")
            .ok()
            .or_else(|| env::var("REGION").ok()),
        service_name: env::var("K_SERVICE").ok(),
        revision: env::var("K_REVISION").ok(),
        configuration: env::var("K_CONFIGURATION").ok(),
    }
}

impl CloudRunSettings {
    /// Returns true when runtime metadata indicates Cloud Run execution.
    pub fn is_cloud_run(&self) -> bool {
        self.service_name.is_some() && self.revision.is_some()
    }

    /// Converts cloud metadata into analytics properties.
    pub fn as_properties(&self) -> Map<String, Value> {
        let mut properties = Map::<String, Value>::new();
        properties.insert("cloud.port".to_string(), Value::from(self.port as i64));

        if let Some(project_id) = &self.project_id {
            properties.insert(
                "cloud.project_id".to_string(),
                Value::String(project_id.clone()),
            );
        }
        if let Some(region) = &self.region {
            properties.insert("cloud.region".to_string(), Value::String(region.clone()));
        }
        if let Some(service_name) = &self.service_name {
            properties.insert(
                "cloud.run.service".to_string(),
                Value::String(service_name.clone()),
            );
        }
        if let Some(revision) = &self.revision {
            properties.insert(
                "cloud.run.revision".to_string(),
                Value::String(revision.clone()),
            );
        }
        if let Some(configuration) = &self.configuration {
            properties.insert(
                "cloud.run.configuration".to_string(),
                Value::String(configuration.clone()),
            );
        }

        properties.insert(
            "cloud.run.detected".to_string(),
            Value::Bool(self.is_cloud_run()),
        );
        properties
    }
}
