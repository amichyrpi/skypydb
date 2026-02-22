use std::collections::BTreeMap;

use chrono::NaiveDateTime;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sqlx::mysql::{MySqlArguments, MySqlRow};
use sqlx::query::Query;
use sqlx::{MySql, MySqlPool, Row, Transaction};
use tracing::instrument;
use uuid::Uuid;

use skypydb_errors::AppError;

/// Sort descriptor used by runtime function query steps.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderByClause {
    /// Field name to sort by.
    pub field: String,
    /// Optional direction (`asc` or `desc`).
    #[serde(default)]
    pub direction: Option<String>,
}

/// Query options for runtime function read operations.
#[derive(Debug, Clone, Default)]
pub struct RelationalQueryOptions {
    /// Optional filter JSON.
    pub where_clause: Option<Value>,
    /// Optional ordering.
    pub order_by: Vec<OrderByClause>,
    /// Optional limit.
    pub limit: Option<u32>,
    /// Optional offset.
    pub offset: Option<u32>,
}

#[derive(Clone)]
pub struct RelationalRepository {
    pool: MySqlPool,
    max_query_limit: u32,
}

#[derive(Debug, Clone)]
enum BoundParam {
    String(String),
    U32(u32),
}

impl RelationalRepository {
    /// Creates a runtime relational repository.
    pub fn new(pool: MySqlPool, max_query_limit: u32) -> Self {
        Self {
            pool,
            max_query_limit,
        }
    }

    /// Creates the backing table when it does not exist.
    #[instrument(skip(self), fields(table = table_name))]
    pub async fn ensure_table(&self, table_name: &str) -> Result<(), AppError> {
        validate_table_name(table_name)?;
        let sql = format!(
            "CREATE TABLE IF NOT EXISTS `{}` (\n                `_id` VARCHAR(36) NOT NULL PRIMARY KEY,\n                `_created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\n                `_updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\n                `_payload` JSON NOT NULL\n            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            table_name
        );
        sqlx::query(&sql).execute(&self.pool).await?;
        Ok(())
    }

    /// Inserts one row and returns generated `_id`.
    #[instrument(skip(self, value), fields(table = table_name))]
    pub async fn insert(&self, table_name: &str, value: &Value) -> Result<String, AppError> {
        self.ensure_table(table_name).await?;
        let payload = require_object_payload(value)?;
        let row_id = Uuid::new_v4().to_string();

        let sql = format!(
            "INSERT INTO `{}` (`_id`, `_payload`) VALUES (?, ?)",
            table_name
        );
        sqlx::query(&sql)
            .bind(&row_id)
            .bind(sqlx::types::Json(payload))
            .execute(&self.pool)
            .await?;

        Ok(row_id)
    }

    /// Inserts one row inside a transaction and returns generated `_id`.
    pub async fn insert_in_transaction(
        &self,
        transaction: &mut Transaction<'_, MySql>,
        table_name: &str,
        value: &Value,
    ) -> Result<String, AppError> {
        let _ = transaction;
        // Table creation is handled once per request via ensure_runtime_tables.
        validate_table_name(table_name)?;
        let payload = require_object_payload(value)?;
        let row_id = Uuid::new_v4().to_string();

        let sql = format!(
            "INSERT INTO `{}` (`_id`, `_payload`) VALUES (?, ?)",
            table_name
        );
        sqlx::query(&sql)
            .bind(&row_id)
            .bind(sqlx::types::Json(payload))
            .execute(&mut **transaction)
            .await?;

        Ok(row_id)
    }

    /// Queries rows from a table using supported filters, sorting, and paging.
    #[instrument(skip(self, options), fields(table = table_name))]
    pub async fn query(
        &self,
        table_name: &str,
        options: RelationalQueryOptions,
    ) -> Result<Vec<Value>, AppError> {
        self.ensure_table(table_name).await?;
        let (sql, params) = build_query_sql(table_name, &options, self.max_query_limit, 100)?;

        let mut query = sqlx::query(&sql);
        for param in &params {
            query = bind_param(query, param);
        }
        let rows = query.fetch_all(&self.pool).await?;
        map_rows(rows)
    }

    /// Queries rows inside an existing transaction.
    pub async fn query_in_transaction(
        &self,
        transaction: &mut Transaction<'_, MySql>,
        table_name: &str,
        options: RelationalQueryOptions,
    ) -> Result<Vec<Value>, AppError> {
        validate_table_name(table_name)?;
        let (sql, params) = build_query_sql(table_name, &options, self.max_query_limit, 100)?;

        let mut query = sqlx::query(&sql);
        for param in &params {
            query = bind_param(query, param);
        }
        let rows = query.fetch_all(&mut **transaction).await?;
        map_rows(rows)
    }

    /// Returns first row from a query.
    pub async fn first(
        &self,
        table_name: &str,
        mut options: RelationalQueryOptions,
    ) -> Result<Option<Value>, AppError> {
        options.limit = Some(1);
        let mut rows = self.query(table_name, options).await?;
        Ok(rows.pop())
    }

    /// Returns first row from a query inside a transaction.
    pub async fn first_in_transaction(
        &self,
        transaction: &mut Transaction<'_, MySql>,
        table_name: &str,
        mut options: RelationalQueryOptions,
    ) -> Result<Option<Value>, AppError> {
        options.limit = Some(1);
        let mut rows = self
            .query_in_transaction(transaction, table_name, options)
            .await?;
        Ok(rows.pop())
    }
}

fn validate_table_name(table_name: &str) -> Result<(), AppError> {
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

fn require_object_payload(value: &Value) -> Result<Value, AppError> {
    if value.is_object() {
        return Ok(value.clone());
    }
    Err(AppError::validation(
        "insert payload must be a JSON object",
    ))
}

fn build_query_sql(
    table_name: &str,
    options: &RelationalQueryOptions,
    max_query_limit: u32,
    default_limit: u32,
) -> Result<(String, Vec<BoundParam>), AppError> {
    validate_table_name(table_name)?;

    let mut sql = format!(
        "SELECT `_id`, `_created_at`, `_updated_at`, `_payload` FROM `{}`",
        table_name
    );
    let mut params = Vec::<BoundParam>::new();

    if let Some(where_clause) = &options.where_clause {
        let (where_sql, mut where_params) = compile_where_clause(where_clause)?;
        sql.push_str(" WHERE ");
        sql.push_str(&where_sql);
        params.append(&mut where_params);
    }

    if !options.order_by.is_empty() {
        let order_sql = compile_order_by(&options.order_by)?;
        sql.push_str(" ORDER BY ");
        sql.push_str(&order_sql);
    }

    let limit = options.limit.unwrap_or(default_limit).min(max_query_limit);
    sql.push_str(" LIMIT ?");
    params.push(BoundParam::U32(limit));

    if let Some(offset) = options.offset {
        sql.push_str(" OFFSET ?");
        params.push(BoundParam::U32(offset));
    }

    Ok((sql, params))
}

fn compile_where_clause(where_clause: &Value) -> Result<(String, Vec<BoundParam>), AppError> {
    let object = where_clause
        .as_object()
        .ok_or_else(|| AppError::validation("where clause must be an object"))?;

    if object.len() != 1 || !object.contains_key("_id") {
        return Err(AppError::validation(
            "only '_id' filters are supported in runtime function where clauses",
        ));
    }

    let id_selector = object
        .get("_id")
        .ok_or_else(|| AppError::validation("missing _id selector"))?;
    let id = parse_id_selector(id_selector)?;
    Ok(("`_id` = ?".to_string(), vec![BoundParam::String(id)]))
}

fn parse_id_selector(selector: &Value) -> Result<String, AppError> {
    if let Some(id) = selector.as_str() {
        return Ok(id.to_string());
    }

    let map = selector
        .as_object()
        .ok_or_else(|| AppError::validation("_id filter must be a string or {_id: {$eq: ...}}"))?;
    let id = map
        .get("$eq")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::validation("_id filter supports only '$eq' string operator"))?;
    Ok(id.to_string())
}

fn compile_order_by(order_by: &[OrderByClause]) -> Result<String, AppError> {
    let mut parts = Vec::<String>::new();

    for entry in order_by {
        let field = entry.field.as_str();
        if field != "_id" && field != "_created_at" && field != "_updated_at" {
            return Err(AppError::validation(format!(
                "unsupported orderBy field '{}'",
                field
            )));
        }

        let direction = entry
            .direction
            .as_deref()
            .unwrap_or("asc")
            .to_ascii_lowercase();
        let sql_direction = match direction.as_str() {
            "asc" => "ASC",
            "desc" => "DESC",
            _ => {
                return Err(AppError::validation(format!(
                    "invalid sort direction '{}' for field '{}'",
                    direction, field
                )));
            }
        };

        parts.push(format!("`{}` {}", field, sql_direction));
    }

    Ok(parts.join(", "))
}

fn bind_param<'q>(
    query: Query<'q, MySql, MySqlArguments>,
    param: &BoundParam,
) -> Query<'q, MySql, MySqlArguments> {
    match param {
        BoundParam::String(value) => query.bind(value.clone()),
        BoundParam::U32(value) => query.bind(*value),
    }
}

fn map_rows(rows: Vec<MySqlRow>) -> Result<Vec<Value>, AppError> {
    rows.into_iter().map(map_row).collect()
}

fn map_row(row: MySqlRow) -> Result<Value, AppError> {
    let id: String = row.try_get("_id")?;
    let created_at: NaiveDateTime = row.try_get("_created_at")?;
    let updated_at: NaiveDateTime = row.try_get("_updated_at")?;
    let payload_json: sqlx::types::Json<Value> = row.try_get("_payload")?;

    let payload_object = payload_json
        .0
        .as_object()
        .cloned()
        .unwrap_or_else(Map::new);

    let mut output = BTreeMap::<String, Value>::new();
    output.insert("_id".to_string(), Value::String(id));
    output.insert(
        "_created_at".to_string(),
        Value::String(created_at.to_string()),
    );
    output.insert(
        "_updated_at".to_string(),
        Value::String(updated_at.to_string()),
    );

    for (key, value) in payload_object {
        output.insert(key, value);
    }

    Ok(Value::Object(output.into_iter().collect()))
}
