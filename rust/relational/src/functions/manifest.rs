use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use skypydb_common::schema::types::FieldDefinition;
use skypydb_errors::AppError;

/// Supported function kinds in the generated manifest.
#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FunctionKind {
    /// Read-only function.
    Query,
    /// Read/write function.
    Mutation,
}

/// Generic function step payload produced by the TypeScript compiler.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestStep {
    /// Step operation name.
    pub op: String,
    /// Optional destination variable name.
    #[serde(default)]
    pub into: Option<String>,
    /// Step-specific payload keys.
    #[serde(flatten)]
    pub payload: BTreeMap<String, Value>,
}

/// One endpoint definition in the generated manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestFunction {
    /// Read/write kind.
    pub kind: FunctionKind,
    /// Runtime arg schema definition.
    #[serde(default)]
    pub args: BTreeMap<String, FieldDefinition>,
    /// Ordered execution steps.
    #[serde(default)]
    pub steps: Vec<ManifestStep>,
}

/// Full generated function manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionsManifest {
    /// Manifest schema version.
    pub version: u32,
    /// Endpoint map keyed by `<module>.<function>`.
    pub functions: BTreeMap<String, ManifestFunction>,
}

/// Loads and validates a function manifest from disk.
pub fn load_manifest(path: &Path) -> Result<Option<FunctionsManifest>, AppError> {
    if !path.exists() {
        return Ok(None);
    }

    let raw = std::fs::read_to_string(path).map_err(|error| {
        AppError::internal(format!(
            "failed reading functions manifest at '{}': {}",
            path.display(),
            error
        ))
    })?;
    let manifest = serde_json::from_str::<FunctionsManifest>(&raw).map_err(|error| {
        AppError::validation(format!(
            "failed to parse functions manifest at '{}': {}",
            path.display(),
            error
        ))
    })?;
    validate_manifest(path, &manifest)?;
    Ok(Some(manifest))
}

fn validate_manifest(path: &Path, manifest: &FunctionsManifest) -> Result<(), AppError> {
    if manifest.version != 1 {
        return Err(AppError::validation(format!(
            "unsupported functions manifest version '{}' at '{}'; expected 1",
            manifest.version,
            path.display()
        )));
    }

    let allowed_ops = BTreeSet::from([
        "get",
        "first",
        "count",
        "insert",
        "update",
        "delete",
        "move",
        "assert",
        "setVar",
        "return",
        "applySchema",
    ]);

    for (endpoint, function) in &manifest.functions {
        if endpoint.trim().is_empty() {
            return Err(AppError::validation(format!(
                "functions manifest '{}' contains an empty endpoint key",
                path.display()
            )));
        }
        if function.steps.is_empty() {
            return Err(AppError::validation(format!(
                "function '{}' has no steps in '{}'",
                endpoint,
                path.display()
            )));
        }
        for (index, step) in function.steps.iter().enumerate() {
            if !allowed_ops.contains(step.op.as_str()) {
                return Err(AppError::validation(format!(
                    "function '{}' step {} uses unsupported op '{}'",
                    endpoint, index, step.op
                )));
            }
        }
    }

    Ok(())
}

/// Resolves the configured manifest path, keeping defaults stable.
pub fn default_manifest_path() -> PathBuf {
    PathBuf::from("./skypydb/.generated/functions.manifest.json")
}

#[cfg(test)]
mod tests {
    use super::load_manifest;
    use std::fs;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn temp_manifest_path() -> PathBuf {
        std::env::temp_dir().join(format!("skypydb-functions-{}.json", Uuid::new_v4()))
    }

    #[test]
    fn load_manifest_returns_none_when_file_missing() {
        let path = temp_manifest_path();
        let loaded = load_manifest(&path).expect("missing manifest should not fail");
        assert!(loaded.is_none());
    }

    #[test]
    fn load_manifest_rejects_unknown_version() {
        let path = temp_manifest_path();
        fs::write(
            &path,
            r#"{"version":2,"functions":{"users.list":{"kind":"query","args":{},"steps":[{"op":"get","table":"users"}]}}}"#,
        )
        .expect("write manifest");

        let error = load_manifest(&path).expect_err("version mismatch should fail");
        assert!(error
            .to_string()
            .contains("unsupported functions manifest version"));
        let _ = fs::remove_file(path);
    }
}
