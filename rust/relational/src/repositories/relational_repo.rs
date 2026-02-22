use std::collections::{BTreeMap, HashSet};

use chrono::Utc;
use serde_json::{Map, Value};
use sqlx::mysql::{MySqlArguments, MySqlRow};
use sqlx::query::Query;
use sqlx::{MySql, MySqlPool, Row};
use tracing::instrument;
use uuid::Uuid;

use crate::domain::relational::query_planner::{
    compile_order_by, map_row_to_target_payload, OrderByClause,
};
use crate::domain::relational::validator::{
    effective_limit, validate_id_where_xor, validate_identifier, validate_table_name,
};
use crate::domain::relational::where_clause::compile_where_clause;
use crate::repositories::schema_repo::SchemaRepository;
use skypydb_common::schema::types::{FieldDefinition, FieldType, SchemaDocument, TableDefinition};
use skypydb_database::query_builder::{bind_params, placeholders};
use skypydb_errors::AppError;

/// Query options for relational read operations.
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

/// Move operation selector and mapping.
#[derive(Debug, Clone, Default)]
pub struct MoveOptions {
    /// Target table name.
    pub to_table: String,
    /// Optional single-row selector.
    pub id: Option<String>,
    /// Optional where selector.
    pub where_clause: Option<Value>,
    /// Mapping target field -> source field.
    pub field_map: BTreeMap<String, String>,
    /// Literal default values.
    pub defaults: BTreeMap<String, Value>,
}

/// Relational repository implementing CRUD/query/move with runtime schema validation.
#[derive(Clone)]
pub struct RelationalRepository {
    pool: MySqlPool,
    max_query_limit: u32,
}

impl RelationalRepository {
    /// Creates a relational repository.
    pub fn new(pool: MySqlPool, max_query_limit: u32) -> Self {
        Self {
            pool,
            max_query_limit,
        }
    }

    /// Inserts one row and returns generated `_id`.
    #[instrument(skip(self, value), fields(table = table_name))]
    pub async fn insert(&self, table_name: &str, value: &Value) -> Result<String, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;

        let row_payload = prepare_payload(table_definition, value, false)?;
        self.validate_foreign_keys(table_definition, &row_payload)
            .await?;

        let row_id = Uuid::new_v4().to_string();
        let mut fields = vec![
            "`_id`".to_string(),
            "`_created_at`".to_string(),
            "`_updated_at`".to_string(),
            "`_extras`".to_string(),
        ];
        let mut values = vec![
            Value::String(row_id.clone()),
            Value::String(Utc::now().naive_utc().to_string()),
            Value::String(Utc::now().naive_utc().to_string()),
            row_payload.extras.clone(),
        ];

        for (field_name, field_value) in &row_payload.known_fields {
            fields.push(format!("`{}`", field_name));
            values.push(field_value.clone());
        }

        let sql = format!(
            "INSERT INTO `{}` ({}) VALUES ({})",
            table_name,
            fields.join(", "),
            placeholders(values.len())
        );
        let mut query = sqlx::query(&sql);
        for value in &values {
            query = bind_json_value(query, value)?;
        }
        query.execute(&self.pool).await?;
        Ok(row_id)
    }

    /// Performs full-replace updates by `id` or `where` selector.
    #[instrument(skip(self, where_clause, value), fields(table = table_name, id = id))]
    pub async fn update(
        &self,
        table_name: &str,
        id: Option<&str>,
        where_clause: Option<&Value>,
        value: &Value,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        validate_id_where_xor(id, where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let row_payload = prepare_payload(table_definition, value, true)?;
        self.validate_foreign_keys(table_definition, &row_payload)
            .await?;

        let mut assignments = Vec::<String>::new();
        let mut params = Vec::<Value>::new();
        for (field_name, field_value) in &row_payload.known_fields {
            assignments.push(format!("`{}` = ?", field_name));
            params.push(field_value.clone());
        }
        assignments.push("`_extras` = ?".to_string());
        params.push(row_payload.extras);
        assignments.push("`_updated_at` = ?".to_string());
        params.push(Value::String(Utc::now().naive_utc().to_string()));

        let mut sql = format!("UPDATE `{}` SET {}", table_name, assignments.join(", "));
        if let Some(row_id) = id {
            sql.push_str(" WHERE `_id` = ?");
            params.push(Value::String(row_id.to_string()));
        } else {
            let allowed = allowed_fields(table_definition);
            let compiled = compile_where_clause(where_clause, &allowed)?;
            let clause = compiled
                .clause
                .ok_or_else(|| AppError::validation("where clause cannot be empty"))?;
            sql.push_str(&format!(" WHERE {}", clause));
            for param in compiled.params {
                params.push(sql_param_to_json(param));
            }
        }

        let mut query = sqlx::query(&sql);
        for parameter in &params {
            query = bind_json_value(query, parameter)?;
        }
        let result = query.execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    /// Deletes rows by `id` or `where`.
    #[instrument(skip(self, where_clause), fields(table = table_name, id = id))]
    pub async fn delete(
        &self,
        table_name: &str,
        id: Option<&str>,
        where_clause: Option<&Value>,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        validate_id_where_xor(id, where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let mut sql = format!("DELETE FROM `{}`", table_name);
        let mut params = Vec::<Value>::new();

        if let Some(row_id) = id {
            sql.push_str(" WHERE `_id` = ?");
            params.push(Value::String(row_id.to_string()));
        } else {
            let allowed = allowed_fields(table_definition);
            let compiled = compile_where_clause(where_clause, &allowed)?;
            let clause = compiled
                .clause
                .ok_or_else(|| AppError::validation("where clause cannot be empty"))?;
            sql.push_str(&format!(" WHERE {}", clause));
            for param in compiled.params {
                params.push(sql_param_to_json(param));
            }
        }

        let mut query = sqlx::query(&sql);
        for parameter in &params {
            query = bind_json_value(query, parameter)?;
        }
        let result = query.execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    /// Moves rows from one table to another within a single transaction.
    #[instrument(skip(self, options), fields(from_table = from_table, to_table = options.to_table))]
    pub async fn move_rows(
        &self,
        from_table: &str,
        options: &MoveOptions,
    ) -> Result<u64, AppError> {
        validate_table_name(from_table)?;
        validate_table_name(&options.to_table)?;
        if from_table == options.to_table {
            return Err(AppError::validation("fromTable and toTable must differ"));
        }
        validate_id_where_xor(options.id.as_deref(), options.where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let source_definition = schema_table(&schema, from_table)?;
        let target_definition = schema_table(&schema, &options.to_table)?;

        let selected_rows = self
            .query(
                from_table,
                RelationalQueryOptions {
                    where_clause: options.where_clause.clone(),
                    order_by: Vec::new(),
                    limit: None,
                    offset: None,
                },
            )
            .await?;

        let selected_rows = if let Some(id) = &options.id {
            selected_rows
                .into_iter()
                .filter(|row| row.get("_id") == Some(&Value::String(id.clone())))
                .collect::<Vec<Value>>()
        } else {
            selected_rows
        };

        if selected_rows.is_empty() {
            return Ok(0);
        }

        let mut transaction = self.pool.begin().await?;
        let mut moved = 0_u64;
        for row in selected_rows {
            let source_map = row
                .as_object()
                .ok_or_else(|| AppError::internal("selected row is not a JSON object"))?;
            let mapped_payload = map_row_to_target_payload(
                source_map,
                target_definition,
                &options.field_map,
                &options.defaults,
            )?;
            let prepared =
                prepare_payload(target_definition, &Value::Object(mapped_payload), false)?;
            self.validate_foreign_keys(target_definition, &prepared)
                .await?;

            let row_id = source_map
                .get("_id")
                .and_then(Value::as_str)
                .ok_or_else(|| AppError::internal("source row missing _id"))?
                .to_string();

            let exists_sql = format!(
                "SELECT COUNT(1) FROM `{}` WHERE `_id` = ?",
                options.to_table
            );
            let exists: i64 = sqlx::query_scalar(&exists_sql)
                .bind(&row_id)
                .fetch_one(&mut *transaction)
                .await?;
            if exists > 0 {
                return Err(AppError::validation(format!(
                    "cannot move row '{}': target table already contains this _id",
                    row_id
                )));
            }

            insert_prepared_row(
                &mut transaction,
                &options.to_table,
                &row_id,
                source_map.get("_created_at"),
                &prepared,
            )
            .await?;

            let delete_sql = format!("DELETE FROM `{}` WHERE `_id` = ?", from_table);
            sqlx::query(&delete_sql)
                .bind(&row_id)
                .execute(&mut *transaction)
                .await?;
            moved += 1;
        }
        transaction.commit().await?;

        let _ = source_definition;
        Ok(moved)
    }

    /// Queries rows from a table using filters, sorting, and paging.
    #[instrument(skip(self, options), fields(table = table_name))]
    pub async fn query(
        &self,
        table_name: &str,
        options: RelationalQueryOptions,
    ) -> Result<Vec<Value>, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;

        let allowed = allowed_fields(table_definition);
        let compiled_where = compile_where_clause(options.where_clause.as_ref(), &allowed)?;
        let order_by = compile_order_by(Some(&options.order_by), &allowed)?;
        let limit = effective_limit(options.limit, self.max_query_limit, 100);
        let offset = options.offset.unwrap_or(0);

        let mut sql = format!("SELECT * FROM `{}`", table_name);
        if let Some(clause) = &compiled_where.clause {
            sql.push_str(&format!(" WHERE {}", clause));
        }
        if let Some(order_by_sql) = &order_by {
            sql.push_str(&format!(" ORDER BY {}", order_by_sql));
        }
        sql.push_str(" LIMIT ? OFFSET ?");

        let mut query = bind_params(sqlx::query(&sql), &compiled_where.params);
        query = query.bind(limit as i64).bind(offset as i64);
        let rows = query.fetch_all(&self.pool).await?;
        rows.iter()
            .map(|row| row_to_public_json(row, table_definition))
            .collect::<Result<Vec<Value>, AppError>>()
    }

    /// Returns count of rows matching optional filter.
    #[instrument(skip(self, where_clause), fields(table = table_name))]
    pub async fn count(
        &self,
        table_name: &str,
        where_clause: Option<&Value>,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let allowed = allowed_fields(table_definition);
        let compiled_where = compile_where_clause(where_clause, &allowed)?;

        let mut sql = format!("SELECT COUNT(1) as count_value FROM `{}`", table_name);
        if let Some(clause) = &compiled_where.clause {
            sql.push_str(&format!(" WHERE {}", clause));
        }

        let query = bind_params(sqlx::query(&sql), &compiled_where.params);
        let row = query.fetch_one(&self.pool).await?;
        let count = row.try_get::<i64, _>("count_value")?;
        Ok(count as u64)
    }

    /// Returns the first row that matches filter/sort options.
    #[instrument(skip(self, options), fields(table = table_name))]
    pub async fn first(
        &self,
        table_name: &str,
        mut options: RelationalQueryOptions,
    ) -> Result<Option<Value>, AppError> {
        options.limit = Some(1);
        options.offset = Some(0);
        let mut rows = self.query(table_name, options).await?;
        Ok(rows.pop())
    }

    /// Inserts one row using an existing SQL transaction.
    #[instrument(skip(self, transaction, value), fields(table = table_name))]
    pub async fn insert_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        value: &Value,
    ) -> Result<String, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;

        let row_payload = prepare_payload(table_definition, value, false)?;
        self.validate_foreign_keys_in_transaction(transaction, table_definition, &row_payload)
            .await?;

        let row_id = Uuid::new_v4().to_string();
        let mut fields = vec![
            "`_id`".to_string(),
            "`_created_at`".to_string(),
            "`_updated_at`".to_string(),
            "`_extras`".to_string(),
        ];
        let mut values = vec![
            Value::String(row_id.clone()),
            Value::String(Utc::now().naive_utc().to_string()),
            Value::String(Utc::now().naive_utc().to_string()),
            row_payload.extras.clone(),
        ];

        for (field_name, field_value) in &row_payload.known_fields {
            fields.push(format!("`{}`", field_name));
            values.push(field_value.clone());
        }

        let sql = format!(
            "INSERT INTO `{}` ({}) VALUES ({})",
            table_name,
            fields.join(", "),
            placeholders(values.len())
        );
        let mut query = sqlx::query(&sql);
        for value in &values {
            query = bind_json_value(query, value)?;
        }
        query.execute(&mut **transaction).await?;
        Ok(row_id)
    }

    /// Performs full-replace updates in an existing SQL transaction.
    #[instrument(skip(self, transaction, where_clause, value), fields(table = table_name, id = id))]
    pub async fn update_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        id: Option<&str>,
        where_clause: Option<&Value>,
        value: &Value,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        validate_id_where_xor(id, where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let row_payload = prepare_payload(table_definition, value, true)?;
        self.validate_foreign_keys_in_transaction(transaction, table_definition, &row_payload)
            .await?;

        let mut assignments = Vec::<String>::new();
        let mut params = Vec::<Value>::new();
        for (field_name, field_value) in &row_payload.known_fields {
            assignments.push(format!("`{}` = ?", field_name));
            params.push(field_value.clone());
        }
        assignments.push("`_extras` = ?".to_string());
        params.push(row_payload.extras);
        assignments.push("`_updated_at` = ?".to_string());
        params.push(Value::String(Utc::now().naive_utc().to_string()));

        let mut sql = format!("UPDATE `{}` SET {}", table_name, assignments.join(", "));
        if let Some(row_id) = id {
            sql.push_str(" WHERE `_id` = ?");
            params.push(Value::String(row_id.to_string()));
        } else {
            let allowed = allowed_fields(table_definition);
            let compiled = compile_where_clause(where_clause, &allowed)?;
            let clause = compiled
                .clause
                .ok_or_else(|| AppError::validation("where clause cannot be empty"))?;
            sql.push_str(&format!(" WHERE {}", clause));
            for param in compiled.params {
                params.push(sql_param_to_json(param));
            }
        }

        let mut query = sqlx::query(&sql);
        for parameter in &params {
            query = bind_json_value(query, parameter)?;
        }
        let result = query.execute(&mut **transaction).await?;
        Ok(result.rows_affected())
    }

    /// Deletes rows in an existing SQL transaction.
    #[instrument(skip(self, transaction, where_clause), fields(table = table_name, id = id))]
    pub async fn delete_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        id: Option<&str>,
        where_clause: Option<&Value>,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        validate_id_where_xor(id, where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let mut sql = format!("DELETE FROM `{}`", table_name);
        let mut params = Vec::<Value>::new();

        if let Some(row_id) = id {
            sql.push_str(" WHERE `_id` = ?");
            params.push(Value::String(row_id.to_string()));
        } else {
            let allowed = allowed_fields(table_definition);
            let compiled = compile_where_clause(where_clause, &allowed)?;
            let clause = compiled
                .clause
                .ok_or_else(|| AppError::validation("where clause cannot be empty"))?;
            sql.push_str(&format!(" WHERE {}", clause));
            for param in compiled.params {
                params.push(sql_param_to_json(param));
            }
        }

        let mut query = sqlx::query(&sql);
        for parameter in &params {
            query = bind_json_value(query, parameter)?;
        }
        let result = query.execute(&mut **transaction).await?;
        Ok(result.rows_affected())
    }

    /// Moves rows between tables in an existing SQL transaction.
    #[instrument(
        skip(self, transaction, options),
        fields(from_table = from_table, to_table = options.to_table)
    )]
    pub async fn move_rows_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        from_table: &str,
        options: &MoveOptions,
    ) -> Result<u64, AppError> {
        validate_table_name(from_table)?;
        validate_table_name(&options.to_table)?;
        if from_table == options.to_table {
            return Err(AppError::validation("fromTable and toTable must differ"));
        }
        validate_id_where_xor(options.id.as_deref(), options.where_clause.is_some())?;

        let schema = self.active_schema().await?;
        let source_definition = schema_table(&schema, from_table)?;
        let target_definition = schema_table(&schema, &options.to_table)?;

        let selected_rows = self
            .query_in_transaction(
                transaction,
                from_table,
                RelationalQueryOptions {
                    where_clause: options.where_clause.clone(),
                    order_by: Vec::new(),
                    limit: None,
                    offset: None,
                },
            )
            .await?;

        let selected_rows = if let Some(id) = &options.id {
            selected_rows
                .into_iter()
                .filter(|row| row.get("_id") == Some(&Value::String(id.clone())))
                .collect::<Vec<Value>>()
        } else {
            selected_rows
        };

        if selected_rows.is_empty() {
            return Ok(0);
        }

        let mut moved = 0_u64;
        for row in selected_rows {
            let source_map = row
                .as_object()
                .ok_or_else(|| AppError::internal("selected row is not a JSON object"))?;
            let mapped_payload = map_row_to_target_payload(
                source_map,
                target_definition,
                &options.field_map,
                &options.defaults,
            )?;
            let prepared =
                prepare_payload(target_definition, &Value::Object(mapped_payload), false)?;
            self.validate_foreign_keys_in_transaction(transaction, target_definition, &prepared)
                .await?;

            let row_id = source_map
                .get("_id")
                .and_then(Value::as_str)
                .ok_or_else(|| AppError::internal("source row missing _id"))?
                .to_string();

            let exists_sql = format!(
                "SELECT COUNT(1) FROM `{}` WHERE `_id` = ?",
                options.to_table
            );
            let exists: i64 = sqlx::query_scalar(&exists_sql)
                .bind(&row_id)
                .fetch_one(&mut **transaction)
                .await?;
            if exists > 0 {
                return Err(AppError::validation(format!(
                    "cannot move row '{}': target table already contains this _id",
                    row_id
                )));
            }

            insert_prepared_row(
                transaction,
                &options.to_table,
                &row_id,
                source_map.get("_created_at"),
                &prepared,
            )
            .await?;

            let delete_sql = format!("DELETE FROM `{}` WHERE `_id` = ?", from_table);
            sqlx::query(&delete_sql)
                .bind(&row_id)
                .execute(&mut **transaction)
                .await?;
            moved += 1;
        }

        let _ = source_definition;
        Ok(moved)
    }

    /// Queries rows in an existing SQL transaction.
    #[instrument(skip(self, transaction, options), fields(table = table_name))]
    pub async fn query_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        options: RelationalQueryOptions,
    ) -> Result<Vec<Value>, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;

        let allowed = allowed_fields(table_definition);
        let compiled_where = compile_where_clause(options.where_clause.as_ref(), &allowed)?;
        let order_by = compile_order_by(Some(&options.order_by), &allowed)?;
        let limit = effective_limit(options.limit, self.max_query_limit, 100);
        let offset = options.offset.unwrap_or(0);

        let mut sql = format!("SELECT * FROM `{}`", table_name);
        if let Some(clause) = &compiled_where.clause {
            sql.push_str(&format!(" WHERE {}", clause));
        }
        if let Some(order_by_sql) = &order_by {
            sql.push_str(&format!(" ORDER BY {}", order_by_sql));
        }
        sql.push_str(" LIMIT ? OFFSET ?");

        let mut query = bind_params(sqlx::query(&sql), &compiled_where.params);
        query = query.bind(limit as i64).bind(offset as i64);
        let rows = query.fetch_all(&mut **transaction).await?;
        rows.iter()
            .map(|row| row_to_public_json(row, table_definition))
            .collect::<Result<Vec<Value>, AppError>>()
    }

    /// Counts rows in an existing SQL transaction.
    #[instrument(skip(self, transaction, where_clause), fields(table = table_name))]
    pub async fn count_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        where_clause: Option<&Value>,
    ) -> Result<u64, AppError> {
        validate_table_name(table_name)?;
        let schema = self.active_schema().await?;
        let table_definition = schema_table(&schema, table_name)?;
        let allowed = allowed_fields(table_definition);
        let compiled_where = compile_where_clause(where_clause, &allowed)?;

        let mut sql = format!("SELECT COUNT(1) as count_value FROM `{}`", table_name);
        if let Some(clause) = &compiled_where.clause {
            sql.push_str(&format!(" WHERE {}", clause));
        }

        let query = bind_params(sqlx::query(&sql), &compiled_where.params);
        let row = query.fetch_one(&mut **transaction).await?;
        let count = row.try_get::<i64, _>("count_value")?;
        Ok(count as u64)
    }

    /// Returns first row in an existing SQL transaction.
    #[instrument(skip(self, transaction, options), fields(table = table_name))]
    pub async fn first_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_name: &str,
        mut options: RelationalQueryOptions,
    ) -> Result<Option<Value>, AppError> {
        options.limit = Some(1);
        options.offset = Some(0);
        let mut rows = self
            .query_in_transaction(transaction, table_name, options)
            .await?;
        Ok(rows.pop())
    }

    async fn active_schema(&self) -> Result<SchemaDocument, AppError> {
        SchemaRepository::new(self.pool.clone())
            .get_active_schema()
            .await?
            .ok_or_else(|| {
                AppError::validation("no active schema; call /v1/admin/schema/apply first")
            })
    }

    async fn validate_foreign_keys(
        &self,
        table_definition: &TableDefinition,
        payload: &PreparedPayload,
    ) -> Result<(), AppError> {
        for (field_name, field_definition) in &table_definition.fields {
            let base = field_definition.unwrap_base();
            if base.field_type != FieldType::Id {
                continue;
            }
            let Some(target_table) = base.table.as_ref() else {
                continue;
            };
            let Some(value) = payload.known_fields.get(field_name) else {
                continue;
            };
            if value.is_null() {
                continue;
            }
            let id = value.as_str().ok_or_else(|| {
                AppError::validation(format!("field '{}' expects string id", field_name))
            })?;
            let sql = format!("SELECT COUNT(1) FROM `{}` WHERE `_id` = ?", target_table);
            let count: i64 = sqlx::query_scalar(&sql)
                .bind(id)
                .fetch_one(&self.pool)
                .await?;
            if count == 0 {
                return Err(AppError::validation(format!(
                    "foreign key constraint failed for '{}': id '{}' does not exist in '{}'",
                    field_name, id, target_table
                )));
            }
        }
        Ok(())
    }

    async fn validate_foreign_keys_in_transaction(
        &self,
        transaction: &mut sqlx::Transaction<'_, MySql>,
        table_definition: &TableDefinition,
        payload: &PreparedPayload,
    ) -> Result<(), AppError> {
        for (field_name, field_definition) in &table_definition.fields {
            let base = field_definition.unwrap_base();
            if base.field_type != FieldType::Id {
                continue;
            }
            let Some(target_table) = base.table.as_ref() else {
                continue;
            };
            let Some(value) = payload.known_fields.get(field_name) else {
                continue;
            };
            if value.is_null() {
                continue;
            }
            let id = value.as_str().ok_or_else(|| {
                AppError::validation(format!("field '{}' expects string id", field_name))
            })?;
            let sql = format!("SELECT COUNT(1) FROM `{}` WHERE `_id` = ?", target_table);
            let count: i64 = sqlx::query_scalar(&sql)
                .bind(id)
                .fetch_one(&mut **transaction)
                .await?;
            if count == 0 {
                return Err(AppError::validation(format!(
                    "foreign key constraint failed for '{}': id '{}' does not exist in '{}'",
                    field_name, id, target_table
                )));
            }
        }
        Ok(())
    }
}

struct PreparedPayload {
    known_fields: BTreeMap<String, Value>,
    extras: Value,
}

fn schema_table<'a>(
    schema: &'a SchemaDocument,
    table_name: &str,
) -> Result<&'a TableDefinition, AppError> {
    schema.tables.get(table_name).ok_or_else(|| {
        AppError::not_found(format!("table '{}' not found in active schema", table_name))
    })
}

fn allowed_fields(table_definition: &TableDefinition) -> HashSet<String> {
    let mut fields = table_definition
        .fields
        .keys()
        .cloned()
        .collect::<HashSet<String>>();
    fields.insert("_id".to_string());
    fields.insert("_created_at".to_string());
    fields.insert("_updated_at".to_string());
    fields
}

fn prepare_payload(
    table_definition: &TableDefinition,
    value: &Value,
    full_replace: bool,
) -> Result<PreparedPayload, AppError> {
    let object = value
        .as_object()
        .ok_or_else(|| AppError::validation("value must be an object"))?;
    let mut known_fields = BTreeMap::<String, Value>::new();
    let mut extras_map = Map::<String, Value>::new();

    for (key, raw_value) in object {
        if key == "_id" || key == "_created_at" || key == "_updated_at" || key == "_extras" {
            continue;
        }
        if let Some(field_definition) = table_definition.fields.get(key) {
            known_fields.insert(
                key.clone(),
                validate_field_value(field_definition, raw_value, key)?,
            );
        } else {
            extras_map.insert(key.clone(), raw_value.clone());
        }
    }

    for (field_name, field_definition) in &table_definition.fields {
        if known_fields.contains_key(field_name) {
            continue;
        }
        if field_definition.is_optional() {
            known_fields.insert(field_name.clone(), Value::Null);
            continue;
        }
        if full_replace {
            return Err(AppError::validation(format!(
                "missing required field '{}'",
                field_name
            )));
        }
        return Err(AppError::validation(format!(
            "insert payload missing required field '{}'",
            field_name
        )));
    }

    Ok(PreparedPayload {
        known_fields,
        extras: Value::Object(extras_map),
    })
}

fn validate_field_value(
    definition: &FieldDefinition,
    raw_value: &Value,
    field_name: &str,
) -> Result<Value, AppError> {
    if definition.field_type == FieldType::Optional {
        if raw_value.is_null() {
            return Ok(Value::Null);
        }
        let inner = definition.inner.as_ref().ok_or_else(|| {
            AppError::validation(format!(
                "optional field '{}' is missing inner definition",
                field_name
            ))
        })?;
        return validate_field_value(inner.as_ref(), raw_value, field_name);
    }

    match definition.field_type {
        FieldType::String | FieldType::Id => raw_value
            .as_str()
            .map(|next| Value::String(next.to_string()))
            .ok_or_else(|| {
                AppError::validation(format!("field '{}' must be a string", field_name))
            }),
        FieldType::Number => {
            if let Some(int_value) = raw_value.as_i64() {
                Ok(Value::Number(int_value.into()))
            } else if let Some(float_value) = raw_value.as_f64() {
                serde_json::Number::from_f64(float_value)
                    .map(Value::Number)
                    .ok_or_else(|| {
                        AppError::validation(format!(
                            "field '{}' contains invalid number",
                            field_name
                        ))
                    })
            } else {
                Err(AppError::validation(format!(
                    "field '{}' must be a number",
                    field_name
                )))
            }
        }
        FieldType::Boolean => raw_value.as_bool().map(Value::Bool).ok_or_else(|| {
            AppError::validation(format!("field '{}' must be a boolean", field_name))
        }),
        FieldType::Object => {
            if raw_value.is_object() {
                Ok(raw_value.clone())
            } else {
                Err(AppError::validation(format!(
                    "field '{}' must be an object",
                    field_name
                )))
            }
        }
        FieldType::Optional => Err(AppError::validation("nested optional not supported")),
    }
}

fn sql_param_to_json(param: skypydb_common::query::SqlParam) -> Value {
    match param {
        skypydb_common::query::SqlParam::String(value) => Value::String(value),
        skypydb_common::query::SqlParam::Number(value) => serde_json::Number::from_f64(value)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        skypydb_common::query::SqlParam::Bool(value) => Value::Bool(value),
    }
}

fn row_to_public_json(
    row: &MySqlRow,
    table_definition: &TableDefinition,
) -> Result<Value, AppError> {
    let mut output = Map::<String, Value>::new();

    let id = row.try_get::<String, _>("_id")?;
    output.insert("_id".to_string(), Value::String(id));

    let created_at = row
        .try_get::<chrono::NaiveDateTime, _>("_created_at")
        .map(|value| value.to_string())
        .unwrap_or_default();
    output.insert("_created_at".to_string(), Value::String(created_at));

    let updated_at = row
        .try_get::<chrono::NaiveDateTime, _>("_updated_at")
        .map(|value| value.to_string())
        .unwrap_or_default();
    output.insert("_updated_at".to_string(), Value::String(updated_at));

    let extras = row
        .try_get::<Option<sqlx::types::Json<Value>>, _>("_extras")
        .ok()
        .flatten()
        .map(|json| json.0)
        .unwrap_or_else(|| Value::Object(Map::new()));
    output.insert("_extras".to_string(), extras);

    for (field_name, definition) in &table_definition.fields {
        let base = definition.unwrap_base();
        let value = match base.field_type {
            FieldType::String | FieldType::Id => row
                .try_get::<Option<String>, _>(field_name.as_str())?
                .map(Value::String)
                .unwrap_or(Value::Null),
            FieldType::Number => row
                .try_get::<Option<f64>, _>(field_name.as_str())?
                .and_then(serde_json::Number::from_f64)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            FieldType::Boolean => row
                .try_get::<Option<i8>, _>(field_name.as_str())?
                .map(|next| Value::Bool(next != 0))
                .unwrap_or(Value::Null),
            FieldType::Object => row
                .try_get::<Option<sqlx::types::Json<Value>>, _>(field_name.as_str())?
                .map(|json| json.0)
                .unwrap_or(Value::Null),
            FieldType::Optional => Value::Null,
        };
        output.insert(field_name.clone(), value);
    }

    Ok(Value::Object(output))
}

fn bind_json_value<'q>(
    query: Query<'q, MySql, MySqlArguments>,
    value: &Value,
) -> Result<Query<'q, MySql, MySqlArguments>, AppError> {
    let next = match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(boolean) => query.bind(*boolean),
        Value::Number(number) => {
            if let Some(int_value) = number.as_i64() {
                query.bind(int_value)
            } else if let Some(float_value) = number.as_f64() {
                query.bind(float_value)
            } else {
                return Err(AppError::validation("invalid numeric value"));
            }
        }
        Value::String(text) => query.bind(text.to_string()),
        Value::Array(_) | Value::Object(_) => query.bind(sqlx::types::Json(value.clone())),
    };
    Ok(next)
}

async fn insert_prepared_row(
    transaction: &mut sqlx::Transaction<'_, MySql>,
    table_name: &str,
    row_id: &str,
    created_at: Option<&Value>,
    payload: &PreparedPayload,
) -> Result<(), AppError> {
    let mut fields = vec![
        "`_id`".to_string(),
        "`_created_at`".to_string(),
        "`_updated_at`".to_string(),
        "`_extras`".to_string(),
    ];
    let mut values = vec![
        Value::String(row_id.to_string()),
        created_at
            .cloned()
            .unwrap_or_else(|| Value::String(Utc::now().naive_utc().to_string())),
        Value::String(Utc::now().naive_utc().to_string()),
        payload.extras.clone(),
    ];
    for (field_name, field_value) in &payload.known_fields {
        validate_identifier(field_name)?;
        fields.push(format!("`{}`", field_name));
        values.push(field_value.clone());
    }

    let sql = format!(
        "INSERT INTO `{}` ({}) VALUES ({})",
        table_name,
        fields.join(", "),
        placeholders(values.len())
    );
    let mut query = sqlx::query(&sql);
    for value in &values {
        query = bind_json_value(query, value)?;
    }
    query.execute(&mut **transaction).await?;
    Ok(())
}
