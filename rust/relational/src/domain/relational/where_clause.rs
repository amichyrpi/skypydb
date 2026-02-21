use std::collections::HashSet;

use serde_json::Value;

use crate::domain::relational::validator::validate_identifier;
use skypydb_common::query::{CompiledWhere, SqlParam};
use skypydb_errors::AppError;

/// Compiles a JSON where-clause into SQL and ordered bind parameters.
pub fn compile_where_clause(
    where_clause: Option<&Value>,
    allowed_fields: &HashSet<String>,
) -> Result<CompiledWhere, AppError> {
    match where_clause {
        Some(value) => {
            let (sql, params) = compile_condition(value, allowed_fields)?;
            Ok(CompiledWhere {
                clause: Some(sql),
                params,
            })
        }
        None => Ok(CompiledWhere::default()),
    }
}

fn compile_condition(
    condition: &Value,
    allowed_fields: &HashSet<String>,
) -> Result<(String, Vec<SqlParam>), AppError> {
    let map = condition
        .as_object()
        .ok_or_else(|| AppError::validation("where clause must be an object"))?;

    let mut pieces = Vec::<String>::new();
    let mut params = Vec::<SqlParam>::new();

    for (key, value) in map {
        if key == "$and" || key == "$or" {
            let nested = value
                .as_array()
                .ok_or_else(|| AppError::validation(format!("{} must be an array", key)))?;
            if nested.is_empty() {
                return Err(AppError::validation(format!("{} cannot be empty", key)));
            }

            let mut nested_sql = Vec::<String>::new();
            for entry in nested {
                let (entry_sql, mut entry_params) = compile_condition(entry, allowed_fields)?;
                nested_sql.push(format!("({})", entry_sql));
                params.append(&mut entry_params);
            }
            let glue = if key == "$and" { " AND " } else { " OR " };
            pieces.push(format!("({})", nested_sql.join(glue)));
            continue;
        }

        if !allowed_fields.contains(key) {
            return Err(AppError::validation(format!(
                "unknown filter field '{}'",
                key
            )));
        }
        validate_identifier(key)?;

        if let Some(ops_map) = value.as_object() {
            if ops_map.keys().any(|op| op.starts_with('$')) {
                for (operator, operand) in ops_map {
                    let (piece, mut piece_params) = compile_operator(key, operator, operand)?;
                    pieces.push(piece);
                    params.append(&mut piece_params);
                }
                continue;
            }
        }

        match value {
            Value::Null => pieces.push(format!("`{}` IS NULL", key)),
            _ => {
                pieces.push(format!("`{}` = ?", key));
                params.push(value_to_param(value)?);
            }
        }
    }

    if pieces.is_empty() {
        return Err(AppError::validation(
            "where clause must contain at least one condition",
        ));
    }

    Ok((pieces.join(" AND "), params))
}

fn compile_operator(
    field_name: &str,
    operator: &str,
    operand: &Value,
) -> Result<(String, Vec<SqlParam>), AppError> {
    let sql_field = format!("`{}`", field_name);
    match operator {
        "$eq" => {
            if operand.is_null() {
                Ok((format!("{} IS NULL", sql_field), Vec::new()))
            } else {
                Ok((format!("{} = ?", sql_field), vec![value_to_param(operand)?]))
            }
        }
        "$ne" => {
            if operand.is_null() {
                Ok((format!("{} IS NOT NULL", sql_field), Vec::new()))
            } else {
                Ok((
                    format!("{} <> ?", sql_field),
                    vec![value_to_param(operand)?],
                ))
            }
        }
        "$gt" => Ok((format!("{} > ?", sql_field), vec![number_param(operand)?])),
        "$gte" => Ok((format!("{} >= ?", sql_field), vec![number_param(operand)?])),
        "$lt" => Ok((format!("{} < ?", sql_field), vec![number_param(operand)?])),
        "$lte" => Ok((format!("{} <= ?", sql_field), vec![number_param(operand)?])),
        "$contains" => {
            let value = operand
                .as_str()
                .ok_or_else(|| AppError::validation("$contains expects a string"))?;
            Ok((
                format!("{} LIKE ?", sql_field),
                vec![SqlParam::String(format!("%{}%", value))],
            ))
        }
        "$in" | "$nin" => {
            let items = operand
                .as_array()
                .ok_or_else(|| AppError::validation(format!("{} expects an array", operator)))?;
            if items.is_empty() {
                return Err(AppError::validation(format!(
                    "{} cannot be empty",
                    operator
                )));
            }
            let mut params = Vec::<SqlParam>::new();
            for item in items {
                params.push(value_to_param(item)?);
            }
            let placeholders = std::iter::repeat_n("?", params.len())
                .collect::<Vec<&str>>()
                .join(", ");
            let sql = if operator == "$in" {
                format!("{} IN ({})", sql_field, placeholders)
            } else {
                format!("{} NOT IN ({})", sql_field, placeholders)
            };
            Ok((sql, params))
        }
        _ => Err(AppError::validation(format!(
            "unsupported where operator '{}'",
            operator
        ))),
    }
}

fn value_to_param(value: &Value) -> Result<SqlParam, AppError> {
    if let Some(text) = value.as_str() {
        return Ok(SqlParam::String(text.to_string()));
    }
    if let Some(number) = value.as_f64() {
        return Ok(SqlParam::Number(number));
    }
    if let Some(boolean) = value.as_bool() {
        return Ok(SqlParam::Bool(boolean));
    }
    Err(AppError::validation(
        "where values must be string, number, or boolean",
    ))
}

fn number_param(value: &Value) -> Result<SqlParam, AppError> {
    value
        .as_f64()
        .map(SqlParam::Number)
        .ok_or_else(|| AppError::validation("comparison operator expects a number"))
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use serde_json::json;

    use crate::domain::relational::where_clause::compile_where_clause;

    #[test]
    fn compiles_basic_operators() {
        let allowed = ["score".to_string(), "title".to_string()]
            .into_iter()
            .collect::<HashSet<String>>();
        let filter = json!({
            "$and": [
                {"score": {"$gte": 10}},
                {"title": {"$contains": "sky"}}
            ]
        });
        let compiled = compile_where_clause(Some(&filter), &allowed).expect("compile");
        let sql = compiled.clause.expect("clause");
        assert!(sql.contains("`score` >= ?"));
        assert!(sql.contains("`title` LIKE ?"));
        assert_eq!(compiled.params.len(), 2);
    }
}
