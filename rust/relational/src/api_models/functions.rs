use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Request payload for function execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCallRequest {
    /// Endpoint key in `<module>.<function>` format.
    pub endpoint: String,
    /// Runtime args validated against loaded function definitions.
    #[serde(default)]
    pub args: Value,
}

impl FunctionCallRequest {
    /// Returns args as an object map, defaulting null/empty to `{}`.
    pub fn args_object(&self) -> Result<Map<String, Value>, skypydb_errors::AppError> {
        match &self.args {
            Value::Null => Ok(Map::new()),
            Value::Object(object) => Ok(object.clone()),
            _ => Err(skypydb_errors::AppError::validation(
                "function call args must be a JSON object",
            )),
        }
    }
}

/// Response payload for function execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCallResponse {
    /// Final value returned by the function.
    pub result: Value,
}

/// Source file uploaded by the CLI deploy command.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDeploySourceFile {
    /// File path relative to the function root directory.
    pub path: String,
    /// UTF-8 TypeScript source code.
    pub content: String,
}

/// Request payload for function deployment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDeployRequest {
    /// Target deployment mode selected in the CLI. Defaults to `"local"` when omitted.
    #[serde(default)]
    pub mode: Option<String>,
    /// TypeScript source files to compile into a runtime manifest.
    pub files: Vec<FunctionDeploySourceFile>,
}

/// Response payload after deploying a new manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDeployResponse {
    /// Number of compiled function endpoints in the active manifest.
    pub deployed_functions: usize,
    /// Deployment mode echoed from request metadata.
    pub mode: String,
}
