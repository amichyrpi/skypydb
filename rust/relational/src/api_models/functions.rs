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
