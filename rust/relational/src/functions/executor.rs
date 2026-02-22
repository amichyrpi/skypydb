use std::collections::{BTreeMap, BTreeSet};

use serde_json::{Map, Value};
use sqlx::{MySql, MySqlPool};

use crate::functions::manifest::{FunctionKind, FunctionsManifest, ManifestFunction, ManifestStep};
use crate::repositories::relational_repo::{
    OrderByClause, RelationalQueryOptions, RelationalRepository,
};
use skypydb_common::contracts::field_types::{FieldDefinition, FieldType};
use skypydb_errors::AppError;

/// Executes a runtime-defined function call and returns its JSON result.
pub async fn execute_manifest_function(
    pool: &MySqlPool,
    max_query_limit: u32,
    manifest: &FunctionsManifest,
    endpoint: &str,
    args: Map<String, Value>,
) -> Result<Value, AppError> {
    let function = manifest.functions.get(endpoint).ok_or_else(|| {
        AppError::not_found(format!("function endpoint '{}' not found", endpoint))
    })?;

    let validated_args = validate_args(&function.args, &args)?;
    let repository = RelationalRepository::new(pool.clone(), max_query_limit);

    match function.kind {
        FunctionKind::Query => {
            execute_steps_without_transaction(&repository, function, &validated_args, true).await
        }
        FunctionKind::Mutation => {
            let mut transaction = pool.begin().await?;
            let result = execute_steps_with_transaction(
                &repository,
                function,
                &validated_args,
                &mut transaction,
            )
            .await;

            match result {
                Ok(value) => {
                    transaction.commit().await?;
                    Ok(value)
                }
                Err(error) => {
                    let _ = transaction.rollback().await;
                    Err(error)
                }
            }
        }
    }
}

/// Ensures backing tables used by function steps exist.
pub async fn ensure_runtime_tables(
    pool: &MySqlPool,
    max_query_limit: u32,
    manifest: &FunctionsManifest,
) -> Result<(), AppError> {
    let repository = RelationalRepository::new(pool.clone(), max_query_limit);
    let mut tables = BTreeSet::<String>::new();

    for function in manifest.functions.values() {
        for step in &function.steps {
            if matches!(step.op.as_str(), "get" | "first" | "insert") {
                if let Some(table) = step.payload.get("table").and_then(Value::as_str) {
                    tables.insert(table.to_string());
                }
            }
        }
    }

    for table in tables {
        repository.ensure_table(&table).await?;
    }

    Ok(())
}

struct RuntimeContext {
    args: Map<String, Value>,
    vars: BTreeMap<String, Value>,
}

impl RuntimeContext {
    fn new(args: Map<String, Value>) -> Self {
        Self {
            args,
            vars: BTreeMap::new(),
        }
    }
}

async fn execute_steps_without_transaction(
    repository: &RelationalRepository,
    function: &ManifestFunction,
    args: &Map<String, Value>,
    read_only: bool,
) -> Result<Value, AppError> {
    let mut context = RuntimeContext::new(args.clone());
    let mut last_result = Value::Null;

    for step in &function.steps {
        if read_only && is_write_step(step) {
            return Err(AppError::validation(format!(
                "query function cannot execute '{}' step",
                step.op
            )));
        }

        let step_result =
            execute_step_without_transaction(repository, read_only, &mut context, step).await?;

        if let Some(into) = &step.into {
            context.vars.insert(into.clone(), step_result.clone());
        }
        last_result = step_result;

        if step.op == "return" {
            return Ok(last_result);
        }
    }

    Ok(last_result)
}

async fn execute_steps_with_transaction(
    repository: &RelationalRepository,
    function: &ManifestFunction,
    args: &Map<String, Value>,
    transaction: &mut sqlx::Transaction<'_, MySql>,
) -> Result<Value, AppError> {
    let mut context = RuntimeContext::new(args.clone());
    let mut last_result = Value::Null;

    for step in &function.steps {
        let step_result =
            execute_step_with_transaction(repository, &mut context, transaction, step).await?;

        if let Some(into) = &step.into {
            context.vars.insert(into.clone(), step_result.clone());
        }
        last_result = step_result;

        if step.op == "return" {
            return Ok(last_result);
        }
    }

    Ok(last_result)
}

fn is_write_step(step: &ManifestStep) -> bool {
    matches!(step.op.as_str(), "insert")
}

async fn execute_step_without_transaction(
    repository: &RelationalRepository,
    read_only: bool,
    context: &mut RuntimeContext,
    step: &ManifestStep,
) -> Result<Value, AppError> {
    match step.op.as_str() {
        "get" => {
            let (table, options) = parse_query_step(step, context)?;
            let rows = repository.query(&table, options).await?;
            Ok(Value::Array(rows))
        }
        "first" => {
            let (table, options) = parse_query_step(step, context)?;
            let row = repository.first(&table, options).await?;
            Ok(row.unwrap_or(Value::Null))
        }
        "insert" => {
            ensure_write_allowed(read_only, "insert")?;
            let table = required_string_param(step, "table", context)?;
            let payload = required_json_param(step, "value", context)?;
            let id = repository.insert(&table, &payload).await?;
            Ok(Value::String(id))
        }
        "assert" => {
            let condition = required_json_param(step, "condition", context)?;
            let message = required_literal_string(step, "message")?;
            if !is_truthy(&condition) {
                return Err(AppError::validation(message));
            }
            Ok(Value::Bool(true))
        }
        "setVar" => {
            let name = required_literal_string(step, "name")?;
            let value = required_json_param(step, "value", context)?;
            context.vars.insert(name, value.clone());
            Ok(value)
        }
        "return" => required_json_param(step, "value", context),
        _ => Err(AppError::validation(format!(
            "unsupported function step op '{}'",
            step.op
        ))),
    }
}

async fn execute_step_with_transaction(
    repository: &RelationalRepository,
    context: &mut RuntimeContext,
    transaction: &mut sqlx::Transaction<'_, MySql>,
    step: &ManifestStep,
) -> Result<Value, AppError> {
    match step.op.as_str() {
        "get" => {
            let (table, options) = parse_query_step(step, context)?;
            let rows = repository
                .query_in_transaction(transaction, &table, options)
                .await?;
            Ok(Value::Array(rows))
        }
        "first" => {
            let (table, options) = parse_query_step(step, context)?;
            let row = repository
                .first_in_transaction(transaction, &table, options)
                .await?;
            Ok(row.unwrap_or(Value::Null))
        }
        "insert" => {
            let table = required_string_param(step, "table", context)?;
            let payload = required_json_param(step, "value", context)?;
            let id = repository
                .insert_in_transaction(transaction, &table, &payload)
                .await?;
            Ok(Value::String(id))
        }
        "assert" => {
            let condition = required_json_param(step, "condition", context)?;
            let message = required_literal_string(step, "message")?;
            if !is_truthy(&condition) {
                return Err(AppError::validation(message));
            }
            Ok(Value::Bool(true))
        }
        "setVar" => {
            let name = required_literal_string(step, "name")?;
            let value = required_json_param(step, "value", context)?;
            context.vars.insert(name, value.clone());
            Ok(value)
        }
        "return" => required_json_param(step, "value", context),
        _ => Err(AppError::validation(format!(
            "unsupported function step op '{}'",
            step.op
        ))),
    }
}

fn ensure_write_allowed(read_only: bool, op: &str) -> Result<(), AppError> {
    if read_only {
        return Err(AppError::validation(format!(
            "query function cannot execute '{}' step",
            op
        )));
    }
    Ok(())
}

fn parse_query_step(
    step: &ManifestStep,
    context: &RuntimeContext,
) -> Result<(String, RelationalQueryOptions), AppError> {
    let table = required_string_param(step, "table", context)?;
    let where_clause = optional_json_param(step, "where", context)?;
    let order_by = optional_order_by_param(step, "orderBy", context)?;
    let limit = optional_u32_param(step, "limit", context)?;
    let offset = optional_u32_param(step, "offset", context)?;
    Ok((
        table,
        RelationalQueryOptions {
            where_clause,
            order_by,
            limit,
            offset,
        },
    ))
}

fn required_json_param(
    step: &ManifestStep,
    name: &str,
    context: &RuntimeContext,
) -> Result<Value, AppError> {
    let expression = step.payload.get(name).ok_or_else(|| {
        AppError::validation(format!(
            "step '{}' requires '{}' payload value",
            step.op, name
        ))
    })?;
    evaluate_expression(expression, &context.args, &context.vars)
}

fn optional_json_param(
    step: &ManifestStep,
    name: &str,
    context: &RuntimeContext,
) -> Result<Option<Value>, AppError> {
    let Some(expression) = step.payload.get(name) else {
        return Ok(None);
    };
    let value = evaluate_expression(expression, &context.args, &context.vars)?;
    if value.is_null() {
        Ok(None)
    } else {
        Ok(Some(value))
    }
}

fn required_string_param(
    step: &ManifestStep,
    name: &str,
    context: &RuntimeContext,
) -> Result<String, AppError> {
    let value = required_json_param(step, name, context)?;
    value.as_str().map(ToOwned::to_owned).ok_or_else(|| {
        AppError::validation(format!(
            "step '{}' payload '{}' must evaluate to a string",
            step.op, name
        ))
    })
}

fn optional_u32_param(
    step: &ManifestStep,
    name: &str,
    context: &RuntimeContext,
) -> Result<Option<u32>, AppError> {
    let Some(value) = optional_json_param(step, name, context)? else {
        return Ok(None);
    };
    let Some(number) = value.as_u64() else {
        return Err(AppError::validation(format!(
            "step '{}' payload '{}' must evaluate to an integer",
            step.op, name
        )));
    };
    if number > u32::MAX as u64 {
        return Err(AppError::validation(format!(
            "step '{}' payload '{}' is too large for u32",
            step.op, name
        )));
    }
    Ok(Some(number as u32))
}

fn optional_order_by_param(
    step: &ManifestStep,
    name: &str,
    context: &RuntimeContext,
) -> Result<Vec<OrderByClause>, AppError> {
    let Some(value) = optional_json_param(step, name, context)? else {
        return Ok(Vec::new());
    };
    serde_json::from_value::<Vec<OrderByClause>>(value).map_err(|error| {
        AppError::validation(format!(
            "step '{}' payload '{}' must be an order-by array: {}",
            step.op, name, error
        ))
    })
}

fn required_literal_string(step: &ManifestStep, name: &str) -> Result<String, AppError> {
    step.payload
        .get(name)
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| {
            AppError::validation(format!(
                "step '{}' payload '{}' must be a string literal",
                step.op, name
            ))
        })
}

fn evaluate_expression(
    expression: &Value,
    args: &Map<String, Value>,
    vars: &BTreeMap<String, Value>,
) -> Result<Value, AppError> {
    match expression {
        Value::String(text) => {
            if text == "$arg" {
                return Ok(Value::Object(args.clone()));
            }
            if let Some(path) = text.strip_prefix("$arg.") {
                return resolve_reference_path(&Value::Object(args.clone()), path, "arg");
            }
            if let Some(path) = text.strip_prefix("$var.") {
                let mut segments = path.split('.');
                let var_name = segments.next().unwrap_or_default();
                if var_name.is_empty() {
                    return Err(AppError::validation(
                        "invalid variable reference '$var.' in function expression",
                    ));
                }
                let value = vars.get(var_name).ok_or_else(|| {
                    AppError::validation(format!(
                        "function expression references unknown variable '{}'",
                        var_name
                    ))
                })?;
                let remaining = segments.collect::<Vec<&str>>();
                if remaining.is_empty() {
                    return Ok(value.clone());
                }
                return resolve_reference_path(value, &remaining.join("."), "var");
            }
            Ok(Value::String(text.clone()))
        }
        Value::Array(items) => items
            .iter()
            .map(|item| evaluate_expression(item, args, vars))
            .collect::<Result<Vec<Value>, AppError>>()
            .map(Value::Array),
        Value::Object(object) => {
            let mut output = Map::new();
            for (key, value) in object {
                output.insert(key.clone(), evaluate_expression(value, args, vars)?);
            }
            Ok(Value::Object(output))
        }
        Value::Null | Value::Bool(_) | Value::Number(_) => Ok(expression.clone()),
    }
}

fn resolve_reference_path(value: &Value, path: &str, scope: &str) -> Result<Value, AppError> {
    let mut current = value;
    for segment in path.split('.') {
        if segment.is_empty() {
            continue;
        }
        let Some(object) = current.as_object() else {
            return Err(AppError::validation(format!(
                "cannot resolve '{}': '{}' is not an object segment",
                path, segment
            )));
        };
        current = object.get(segment).ok_or_else(|| {
            AppError::validation(format!(
                "missing '{}' reference path segment '{}' in {} scope",
                path, segment, scope
            ))
        })?;
    }
    Ok(current.clone())
}

fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(boolean) => *boolean,
        Value::Number(number) => {
            if let Some(int_value) = number.as_i64() {
                int_value != 0
            } else if let Some(float_value) = number.as_f64() {
                float_value != 0.0
            } else {
                false
            }
        }
        Value::String(text) => !text.is_empty(),
        Value::Array(items) => !items.is_empty(),
        Value::Object(object) => !object.is_empty(),
    }
}

fn validate_args(
    schema: &BTreeMap<String, FieldDefinition>,
    args: &Map<String, Value>,
) -> Result<Map<String, Value>, AppError> {
    let mut output = Map::<String, Value>::new();
    let known_keys = schema.keys().cloned().collect::<BTreeSet<String>>();

    for key in args.keys() {
        if !known_keys.contains(key) {
            return Err(AppError::validation(format!(
                "unknown function arg '{}'",
                key
            )));
        }
    }

    for (field_name, definition) in schema {
        let maybe_value = args.get(field_name);
        let validated =
            validate_arg_value(definition, maybe_value, &format!("args.{}", field_name))?;
        output.insert(field_name.clone(), validated);
    }

    Ok(output)
}

fn validate_arg_value(
    definition: &FieldDefinition,
    raw: Option<&Value>,
    path: &str,
) -> Result<Value, AppError> {
    if definition.field_type == FieldType::Optional {
        let Some(inner) = definition.inner.as_ref() else {
            return Err(AppError::validation(format!(
                "optional arg '{}' is missing inner schema",
                path
            )));
        };
        let Some(raw_value) = raw else {
            return Ok(Value::Null);
        };
        if raw_value.is_null() {
            return Ok(Value::Null);
        }
        return validate_arg_value(inner, Some(raw_value), path);
    }

    let Some(value) = raw else {
        return Err(AppError::validation(format!(
            "missing required function arg '{}'",
            path
        )));
    };

    match definition.field_type {
        FieldType::String | FieldType::Id => value
            .as_str()
            .map(|text| Value::String(text.to_string()))
            .ok_or_else(|| AppError::validation(format!("arg '{}' must be a string", path))),
        FieldType::Number => {
            if let Some(int_value) = value.as_i64() {
                Ok(Value::Number(serde_json::Number::from(int_value)))
            } else if let Some(float_value) = value.as_f64() {
                serde_json::Number::from_f64(float_value)
                    .map(Value::Number)
                    .ok_or_else(|| {
                        AppError::validation(format!("arg '{}' contains invalid number", path))
                    })
            } else {
                Err(AppError::validation(format!(
                    "arg '{}' must be a number",
                    path
                )))
            }
        }
        FieldType::Boolean => value
            .as_bool()
            .map(Value::Bool)
            .ok_or_else(|| AppError::validation(format!("arg '{}' must be a boolean", path))),
        FieldType::Object => {
            let object = value
                .as_object()
                .ok_or_else(|| AppError::validation(format!("arg '{}' must be an object", path)))?;

            let mut output = Map::new();
            for (nested_name, nested_definition) in &definition.shape {
                let nested_path = format!("{}.{}", path, nested_name);
                let nested_raw = object.get(nested_name);
                let nested_validated =
                    validate_arg_value(nested_definition, nested_raw, &nested_path)?;
                output.insert(nested_name.clone(), nested_validated);
            }

            for key in object.keys() {
                if !definition.shape.contains_key(key) {
                    return Err(AppError::validation(format!(
                        "arg '{}' includes unknown nested key '{}'",
                        path, key
                    )));
                }
            }

            Ok(Value::Object(output))
        }
        FieldType::Optional => Err(AppError::validation(format!(
            "arg '{}' uses unsupported nested optional type",
            path
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::{evaluate_expression, validate_args};
    use serde_json::{json, Map, Value};
    use skypydb_common::contracts::field_types::{FieldDefinition, FieldType};
    use std::collections::BTreeMap;

    fn string_field() -> FieldDefinition {
        FieldDefinition {
            field_type: FieldType::String,
            table: None,
            shape: BTreeMap::new(),
            inner: None,
        }
    }

    #[test]
    fn evaluate_expression_resolves_arg_and_var_paths() {
        let args = Map::from_iter([("userId".to_string(), Value::String("u1".to_string()))]);
        let vars = BTreeMap::from_iter([(
            "task".to_string(),
            json!({
                "_id": "t1",
                "title": "Write tests"
            }),
        )]);

        let value = evaluate_expression(
            &json!({
                "userId": "$arg.userId",
                "taskTitle": "$var.task.title"
            }),
            &args,
            &vars,
        )
        .expect("expression should evaluate");

        assert_eq!(
            value,
            json!({
                "userId": "u1",
                "taskTitle": "Write tests"
            })
        );
    }

    #[test]
    fn validate_args_rejects_unknown_keys() {
        let schema = BTreeMap::from_iter([("name".to_string(), string_field())]);
        let args = Map::from_iter([
            ("name".to_string(), Value::String("Theo".to_string())),
            (
                "email".to_string(),
                Value::String("theo@example.com".to_string()),
            ),
        ]);

        let result = validate_args(&schema, &args);
        assert!(result.is_err());
        let message = result.err().expect("validation error").to_string();
        assert!(message.contains("unknown function arg 'email'"));
    }
}
