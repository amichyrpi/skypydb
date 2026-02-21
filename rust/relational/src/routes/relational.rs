use axum::extract::{Path, State};
use axum::routing::post;
use axum::{Json, Router};

use crate::api_models::relational::{
    CountRequest, CountResponse, DeleteRequest, FirstResponse, InsertRequest, InsertResponse,
    MoveRequest, OrderByClause as ApiOrderByClause, QueryRequest, QueryRowsResponse, UpdateRequest,
};
use crate::domain::relational::query_planner::OrderByClause;
use crate::repositories::relational_repo::{
    MoveOptions, RelationalQueryOptions, RelationalRepository,
};
use skypydb_application::state::AppState;
use skypydb_common::api::envelope::{AffectedRowsResponse, ApiEnvelope};
use skypydb_errors::AppError;

/// Registers relational CRUD/query/move endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/relational/{table}/insert", post(insert_row))
        .route("/relational/{table}/update", post(update_rows))
        .route("/relational/{table}/delete", post(delete_rows))
        .route("/relational/{table}/move", post(move_rows))
        .route("/relational/{table}/query", post(query_rows))
        .route("/relational/{table}/count", post(count_rows))
        .route("/relational/{table}/first", post(first_row))
}

async fn insert_row(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<InsertRequest>,
) -> Result<Json<ApiEnvelope<InsertResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let id = repository.insert(&table, &request.value).await?;
    Ok(Json(ApiEnvelope::ok(InsertResponse { id })))
}

async fn update_rows(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<UpdateRequest>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let affected_rows = repository
        .update(
            &table,
            request.id.as_deref(),
            request.where_clause.as_ref(),
            &request.value,
        )
        .await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn delete_rows(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<DeleteRequest>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let affected_rows = repository
        .delete(&table, request.id.as_deref(), request.where_clause.as_ref())
        .await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn move_rows(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<MoveRequest>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let affected_rows = repository
        .move_rows(
            &table,
            &MoveOptions {
                to_table: request.to_table,
                id: request.id,
                where_clause: request.where_clause,
                field_map: request.field_map,
                defaults: request.defaults,
            },
        )
        .await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn query_rows(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<QueryRequest>,
) -> Result<Json<ApiEnvelope<QueryRowsResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let rows = repository.query(&table, to_query_options(request)).await?;
    Ok(Json(ApiEnvelope::ok(QueryRowsResponse { rows })))
}

async fn count_rows(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<CountRequest>,
) -> Result<Json<ApiEnvelope<CountResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let count = repository
        .count(&table, request.where_clause.as_ref())
        .await?;
    Ok(Json(ApiEnvelope::ok(CountResponse { count })))
}

async fn first_row(
    State(state): State<AppState>,
    Path(table): Path<String>,
    Json(request): Json<QueryRequest>,
) -> Result<Json<ApiEnvelope<FirstResponse>>, AppError> {
    let repository = RelationalRepository::new(state.pool.clone(), state.config.query_max_limit);
    let row = repository.first(&table, to_query_options(request)).await?;
    Ok(Json(ApiEnvelope::ok(FirstResponse { row })))
}

fn to_query_options(request: QueryRequest) -> RelationalQueryOptions {
    RelationalQueryOptions {
        where_clause: request.where_clause,
        order_by: request
            .order_by
            .into_iter()
            .map(to_domain_order_by)
            .collect::<Vec<OrderByClause>>(),
        limit: request.limit,
        offset: request.offset,
    }
}

fn to_domain_order_by(clause: ApiOrderByClause) -> OrderByClause {
    OrderByClause {
        field: clause.field,
        direction: clause.direction,
    }
}
