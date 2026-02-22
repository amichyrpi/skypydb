use regex::Regex;

use skypydb_errors::AppError;

/// Validates a table name for safe dynamic SQL usage.
pub fn validate_table_name(table_name: &str) -> Result<(), AppError> {
    let regex = Regex::new(r"^[a-zA-Z][a-zA-Z0-9_]*$")
        .map_err(|error| AppError::internal(format!("failed to build table regex: {}", error)))?;
    if !regex.is_match(table_name) {
        return Err(AppError::validation(format!(
            "invalid table name '{}'",
            table_name
        )));
    }
    Ok(())
}

/// Validates a field/column identifier for safe dynamic SQL usage.
pub fn validate_identifier(identifier: &str) -> Result<(), AppError> {
    let regex = Regex::new(r"^[a-zA-Z_][a-zA-Z0-9_]*$").map_err(|error| {
        AppError::internal(format!("failed to build identifier regex: {}", error))
    })?;
    if !regex.is_match(identifier) {
        return Err(AppError::validation(format!(
            "invalid identifier '{}'",
            identifier
        )));
    }
    Ok(())
}

/// Enforces XOR semantics between `id` and `where` selectors.
pub fn validate_id_where_xor(id: Option<&str>, where_clause_present: bool) -> Result<(), AppError> {
    match (id, where_clause_present) {
        (Some(_), false) | (None, true) => Ok(()),
        (Some(_), true) => Err(AppError::validation(
            "exactly one of 'id' or 'where' must be provided (not both)",
        )),
        (None, false) => Err(AppError::validation(
            "exactly one of 'id' or 'where' must be provided",
        )),
    }
}

/// Clamps the requested limit to a configured maximum.
pub fn effective_limit(requested: Option<u32>, max_limit: u32, default_limit: u32) -> u32 {
    let base = requested.unwrap_or(default_limit);
    std::cmp::min(base, max_limit)
}
