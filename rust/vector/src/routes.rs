use axum::extract::{Path, State};
use axum::routing::{delete, post};
use axum::{Json, Router};

use skypydb_common::api::envelope::{AffectedRowsResponse, ApiEnvelope};

use crate::api_models::{
    CollectionResponse, CreateCollectionRequest, VectorAddItemsRequest, VectorDeleteItemsRequest,
    VectorGetItemsRequest, VectorItemResponse, VectorQueryRequest, VectorQueryResponse,
    VectorUpdateItemsRequest,
};
use crate::repository::{
    NewVectorItem, UpdateVectorItem, VectorItemRecord, VectorQueryResult, VectorRepository,
};
use skypydb_application::state::AppState;
use skypydb_errors::AppError;

/// Registers vector collection and item endpoints.
pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/vector/collections",
            post(create_collection).get(list_collections),
        )
        .route("/vector/collections/:name", delete(delete_collection))
        .route("/vector/collections/:name/items/add", post(add_items))
        .route(
            "/vector/collections/:name/items/update",
            post(update_items),
        )
        .route(
            "/vector/collections/:name/items/delete",
            post(delete_items),
        )
        .route("/vector/collections/:name/items/get", post(get_items))
        .route("/vector/collections/:name/query", post(query_items))
}

async fn create_collection(
    State(state): State<AppState>,
    Json(request): Json<CreateCollectionRequest>,
) -> Result<Json<ApiEnvelope<CollectionResponse>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let collection = repository
        .create_collection(&request.name, request.metadata)
        .await?;
    Ok(Json(ApiEnvelope::ok(to_collection_response(collection))))
}

async fn list_collections(
    State(state): State<AppState>,
) -> Result<Json<ApiEnvelope<Vec<CollectionResponse>>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let collections = repository
        .list_collections()
        .await?
        .into_iter()
        .map(to_collection_response)
        .collect::<Vec<CollectionResponse>>();
    Ok(Json(ApiEnvelope::ok(collections)))
}

async fn delete_collection(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let affected_rows = repository.delete_collection(&name).await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn add_items(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(request): Json<VectorAddItemsRequest>,
) -> Result<Json<ApiEnvelope<Vec<String>>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let inserted_ids = repository
        .add_items(
            &name,
            &request
                .items
                .into_iter()
                .map(|item| NewVectorItem {
                    id: item.id,
                    embedding: item.embedding,
                    document: item.document,
                    metadata: item.metadata,
                })
                .collect::<Vec<NewVectorItem>>(),
        )
        .await?;
    Ok(Json(ApiEnvelope::ok(inserted_ids)))
}

async fn update_items(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(request): Json<VectorUpdateItemsRequest>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let affected_rows = repository
        .update_items(
            &name,
            &request
                .items
                .into_iter()
                .map(|item| UpdateVectorItem {
                    id: item.id,
                    embedding: item.embedding,
                    document: item.document,
                    metadata: item.metadata,
                })
                .collect::<Vec<UpdateVectorItem>>(),
        )
        .await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn delete_items(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(request): Json<VectorDeleteItemsRequest>,
) -> Result<Json<ApiEnvelope<AffectedRowsResponse>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let affected_rows = repository.delete_items(&name, &request.ids).await?;
    Ok(Json(ApiEnvelope::ok(AffectedRowsResponse {
        affected_rows,
    })))
}

async fn get_items(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(request): Json<VectorGetItemsRequest>,
) -> Result<Json<ApiEnvelope<Vec<VectorItemResponse>>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let rows = repository
        .get_items(&name, &request.ids)
        .await?
        .into_iter()
        .map(to_item_response)
        .collect::<Vec<VectorItemResponse>>();
    Ok(Json(ApiEnvelope::ok(rows)))
}

async fn query_items(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(request): Json<VectorQueryRequest>,
) -> Result<Json<ApiEnvelope<VectorQueryResponse>>, AppError> {
    let repository = VectorRepository::new(state.pool.clone(), state.config.vector_max_dim);
    let n_results = request.n_results.unwrap_or(10);
    let result = repository
        .query(&name, &request.query_embeddings, n_results)
        .await?;
    Ok(Json(ApiEnvelope::ok(to_query_response(result))))
}

fn to_collection_response(record: crate::repository::VectorCollectionRecord) -> CollectionResponse {
    CollectionResponse {
        id: record.id,
        name: record.name,
        metadata: record.metadata,
        created_at: record.created_at,
        updated_at: record.updated_at,
    }
}

fn to_item_response(record: VectorItemRecord) -> VectorItemResponse {
    VectorItemResponse {
        id: record.id,
        document: record.document,
        metadata: record.metadata,
    }
}

fn to_query_response(result: VectorQueryResult) -> VectorQueryResponse {
    VectorQueryResponse {
        ids: result.ids,
        documents: result.documents,
        metadatas: result.metadatas,
        distances: result.distances,
    }
}
