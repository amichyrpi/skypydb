"""HTTP-only Mesosphere client for vector APIs."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

from mesosphere.embeddings import get_embedding_function


@dataclass(slots=True)
class HttpTransportError(Exception):
    """Raised when the backend returns an HTTP or transport error."""

    status_code: int
    error_type: str
    message: str
    response_body: Optional[Any] = None

    def __str__(self) -> str:
        return f"[{self.error_type}#{self.status_code}] {self.message}"


class _HttpTransport:
    """Shared sync HTTP transport with envelope parsing."""

    def __init__(self, api_url: str, api_key: str, timeout: float = 30.0):
        self._api_url = api_url.rstrip("/")
        self._api_key = api_key
        self._client = httpx.Client(
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": api_key,
            },
        )

    def request(
        self,
        method: str,
        path: str,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        try:
            response = self._client.request(
                method=method,
                url=f"{self._api_url}{path}",
                json=json_body,
            )
        except httpx.TimeoutException as exc:
            raise HttpTransportError(408, "RequestTimeout", str(exc)) from exc
        except httpx.HTTPError as exc:
            raise HttpTransportError(0, "NetworkError", str(exc)) from exc

        parsed: Any
        text = response.text.strip()
        if not text:
            parsed = None
        else:
            try:
                parsed = response.json()
            except Exception:
                parsed = text

        if response.status_code >= 400:
            if isinstance(parsed, dict):
                error_type = str(parsed.get("error", "HttpError"))
                message = str(parsed.get("message", response.reason_phrase))
            else:
                error_type = "HttpError"
                message = response.reason_phrase
            raise HttpTransportError(
                response.status_code,
                error_type,
                message,
                parsed,
            )

        if isinstance(parsed, dict) and "ok" in parsed and "data" in parsed:
            if not bool(parsed.get("ok")):
                raise HttpTransportError(
                    response.status_code,
                    "ApiEnvelopeError",
                    "Request failed with ok=false response.",
                    parsed,
                )
            return parsed["data"]
        return parsed

    def close(self) -> None:
        self._client.close()


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _encode_segment(value: str) -> str:
    return quote(value, safe="")


def _matches_operator(metadata_value: Any, operator: str, operator_value: Any) -> bool:
    if operator == "$eq":
        return metadata_value == operator_value
    if operator == "$ne":
        return metadata_value != operator_value
    if operator == "$gt":
        return (
            isinstance(metadata_value, (int, float))
            and isinstance(operator_value, (int, float))
            and metadata_value > operator_value
        )
    if operator == "$gte":
        return (
            isinstance(metadata_value, (int, float))
            and isinstance(operator_value, (int, float))
            and metadata_value >= operator_value
        )
    if operator == "$lt":
        return (
            isinstance(metadata_value, (int, float))
            and isinstance(operator_value, (int, float))
            and metadata_value < operator_value
        )
    if operator == "$lte":
        return (
            isinstance(metadata_value, (int, float))
            and isinstance(operator_value, (int, float))
            and metadata_value <= operator_value
        )
    if operator == "$in":
        return isinstance(operator_value, list) and metadata_value in operator_value
    if operator == "$nin":
        return isinstance(operator_value, list) and metadata_value not in operator_value
    return metadata_value == operator_value


def _matches_where(
    metadata: Optional[Dict[str, Any]], where: Optional[Dict[str, Any]]
) -> bool:
    if where is None:
        return True

    values = metadata or {}
    for key, value in where.items():
        if key == "$and":
            if not isinstance(value, list):
                return False
            if not all(_matches_where(values, item) for item in value):
                return False
            continue

        if key == "$or":
            if not isinstance(value, list):
                return False
            if not any(_matches_where(values, item) for item in value):
                return False
            continue

        metadata_value = values.get(key)
        if _is_plain_object(value):
            for operator, operator_value in value.items():
                if not _matches_operator(metadata_value, operator, operator_value):
                    return False
        elif metadata_value != value:
            return False

    return True


def _matches_where_document(
    document: Optional[str],
    where_document: Optional[Dict[str, str]],
) -> bool:
    if where_document is None:
        return True
    value = document or ""
    for operator, text in where_document.items():
        if operator == "$contains" and text not in value:
            return False
        if operator == "$not_contains" and text in value:
            return False
    return True


def _apply_paging(
    rows: List[Any], limit: Optional[int], offset: Optional[int]
) -> List[Any]:
    start = max(0, int(offset or 0))
    if limit is None:
        return rows[start:]
    return rows[start : start + max(0, int(limit))]


def _normalize_collection_rows(payload: Any) -> List[Dict[str, Any]]:
    """Normalize list-collections payload into a validated list of collection objects."""
    rows: Any = payload
    if isinstance(payload, dict):
        if isinstance(payload.get("collections"), list):
            rows = payload.get("collections")
        elif isinstance(payload.get("items"), list):
            rows = payload.get("items")

    if not isinstance(rows, list):
        raise HttpTransportError(
            200,
            "InvalidResponse",
            "Expected a JSON array from GET /v1/vector/collections.",
            payload,
        )

    normalized: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise HttpTransportError(
                200,
                "InvalidResponse",
                "Each collection item must be a JSON object.",
                payload,
            )

        name = row.get("name")
        if not isinstance(name, str) or not name:
            raise HttpTransportError(
                200,
                "InvalidResponse",
                "Each collection item must include a non-empty 'name'.",
                payload,
            )

        metadata = row.get("metadata")
        normalized.append(
            {
                "name": name,
                "metadata": metadata if isinstance(metadata, dict) else {},
            }
        )

    return normalized


class HttpCollection:
    """HTTP collection wrapper implementing vector methods."""

    def __init__(
        self,
        transport: _HttpTransport,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        embedding_function: Optional[Any] = None,
    ):
        self._transport = transport
        self._name = name
        self._metadata = metadata or {}
        self._embedding_function = embedding_function

    @property
    def name(self) -> str:
        return self._name

    @property
    def metadata(self) -> Dict[str, Any]:
        return self._metadata

    def add(
        self,
        *,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        if embeddings is None:
            if documents is None:
                raise ValueError("Either embeddings or documents must be provided.")
            if self._embedding_function is None:
                raise ValueError(
                    "Documents provided but no embedding function set. Configure embedding_provider first."
                )
            embeddings = self._embedding_function(documents)

        if len(embeddings) != len(ids):
            raise ValueError("Number of embeddings must match number of IDs.")
        if documents is not None and len(documents) != len(ids):
            raise ValueError("Number of documents must match number of IDs.")
        if metadatas is not None and len(metadatas) != len(ids):
            raise ValueError("Number of metadatas must match number of IDs.")

        items = []
        for index, item_id in enumerate(ids):
            items.append(
                {
                    "id": item_id,
                    "embedding": embeddings[index],
                    "document": documents[index] if documents is not None else None,
                    "metadata": metadatas[index] if metadatas is not None else None,
                }
            )

        self._transport.request(
            "POST",
            f"/v1/vector/collections/{_encode_segment(self._name)}/items/add",
            {"items": items},
        )

    def get(
        self,
        *,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        include = include or ["embeddings", "documents", "metadatas"]
        rows = self._fetch_rows(ids=ids)
        filtered = [
            row
            for row in rows
            if _matches_where(row.get("metadata"), where)
            and _matches_where_document(row.get("document"), where_document)
        ]
        paged = _apply_paging(filtered, limit, offset)
        return {
            "ids": [row["id"] for row in paged],
            "embeddings": None,
            "documents": (
                [row.get("document") for row in paged]
                if "documents" in include
                else None
            ),
            "metadatas": (
                [row.get("metadata") for row in paged]
                if "metadatas" in include
                else None
            ),
        }

    def query(
        self,
        *,
        query_embeddings: Optional[List[List[float]]] = None,
        query_texts: Optional[List[str]] = None,
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        include = include or ["embeddings", "documents", "metadatas", "distances"]

        if query_embeddings is None:
            if query_texts is None:
                raise ValueError(
                    "Either query_embeddings or query_texts must be provided."
                )
            if self._embedding_function is None:
                raise ValueError(
                    "Query texts provided but no embedding function set. Configure embedding_provider first."
                )
            query_embeddings = self._embedding_function(query_texts)

        fetch_limit = n_results
        if where is not None or where_document is not None:
            fetch_limit = max(fetch_limit, len(self._fetch_rows(ids=None)))

        payload = {
            "query_embeddings": query_embeddings,
            "n_results": fetch_limit,
        }
        response = self._transport.request(
            "POST",
            f"/v1/vector/collections/{_encode_segment(self._name)}/query",
            payload,
        )

        result_ids: List[List[str]] = []
        result_documents: List[List[Optional[str]]] = []
        result_metadatas: List[List[Optional[Dict[str, Any]]]] = []
        result_distances: List[List[float]] = []

        for query_index, id_row in enumerate(response.get("ids", [])):
            doc_row = (
                response.get("documents", [])[query_index]
                if response.get("documents")
                else []
            )
            meta_row = (
                response.get("metadatas", [])[query_index]
                if response.get("metadatas")
                else []
            )
            dist_row = (
                response.get("distances", [])[query_index]
                if response.get("distances")
                else []
            )

            filtered: List[Dict[str, Any]] = []
            for index, item_id in enumerate(id_row):
                candidate = {
                    "id": item_id,
                    "document": doc_row[index] if index < len(doc_row) else None,
                    "metadata": meta_row[index] if index < len(meta_row) else None,
                    "distance": dist_row[index] if index < len(dist_row) else 0.0,
                }
                if _matches_where(
                    candidate["metadata"], where
                ) and _matches_where_document(candidate["document"], where_document):
                    filtered.append(candidate)

            top = filtered[:n_results]
            result_ids.append([row["id"] for row in top])
            result_documents.append([row["document"] for row in top])
            result_metadatas.append([row["metadata"] for row in top])
            result_distances.append([row["distance"] for row in top])

        return {
            "ids": result_ids,
            "embeddings": None,
            "documents": result_documents if "documents" in include else None,
            "metadatas": result_metadatas if "metadatas" in include else None,
            "distances": result_distances if "distances" in include else None,
        }

    def update(
        self,
        *,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        if embeddings is None and documents is not None:
            if self._embedding_function is None:
                raise ValueError(
                    "Documents provided but no embedding function set. Configure embedding_provider first."
                )
            embeddings = self._embedding_function(documents)

        items = []
        for index, item_id in enumerate(ids):
            items.append(
                {
                    "id": item_id,
                    "embedding": embeddings[index] if embeddings is not None else None,
                    "document": documents[index] if documents is not None else None,
                    "metadata": metadatas[index] if metadatas is not None else None,
                }
            )

        self._transport.request(
            "POST",
            f"/v1/vector/collections/{_encode_segment(self._name)}/items/update",
            {"items": items},
        )

    def delete(
        self,
        *,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
    ) -> None:
        if ids:
            self._transport.request(
                "POST",
                f"/v1/vector/collections/{_encode_segment(self._name)}/items/delete",
                {"ids": ids},
            )
            return

        rows = self._fetch_rows(ids=None)
        ids_to_delete = []
        for row in rows:
            if _matches_where(row.get("metadata"), where) and _matches_where_document(
                row.get("document"), where_document
            ):
                ids_to_delete.append(row["id"])

        if not ids_to_delete:
            if where is None and where_document is None:
                raise ValueError(
                    "delete() requires at least one of 'ids', 'where', or 'where_document' to be provided."
                )
            return

        self._transport.request(
            "POST",
            f"/v1/vector/collections/{_encode_segment(self._name)}/items/delete",
            {"ids": ids_to_delete},
        )

    def count(self) -> int:
        return len(self._fetch_rows(ids=None))

    def peek(self, limit: int = 10) -> Dict[str, Any]:
        return self.get(limit=limit)

    def _fetch_rows(self, ids: Optional[List[str]]) -> List[Dict[str, Any]]:
        payload: Dict[str, Any] = {}
        if ids:
            payload["ids"] = ids
        return self._transport.request(
            "POST",
            f"/v1/vector/collections/{_encode_segment(self._name)}/items/get",
            payload,
        )


class HttpClient:
    """Unified HTTP client for vector APIs."""

    def __init__(
        self,
        *,
        api_url: str,
        api_key: str,
        timeout: float = 30.0,
        embedding_provider: Optional[str] = None,
        embedding_model_config: Optional[Dict[str, Any]] = None,
    ):
        if not api_url.strip():
            raise ValueError("api_url must be a non-empty string.")
        if not api_key.strip():
            raise ValueError("api_key must be a non-empty string.")

        self._transport = _HttpTransport(
            api_url=api_url, api_key=api_key, timeout=timeout
        )
        if embedding_provider is not None:
            self._embedding_function = get_embedding_function(
                provider=embedding_provider,
                **(embedding_model_config or {}),
            )
        else:
            self._embedding_function = None

    def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> HttpCollection:
        data = self._transport.request(
            "POST",
            "/v1/vector/collections",
            {"name": name, "metadata": metadata},
        )
        return HttpCollection(
            transport=self._transport,
            name=data["name"],
            metadata=data.get("metadata") or {},
            embedding_function=self._embedding_function,
        )

    def list_collections(self) -> List[HttpCollection]:
        rows = _normalize_collection_rows(
            self._transport.request("GET", "/v1/vector/collections")
        )
        return [
            HttpCollection(
                transport=self._transport,
                name=row["name"],
                metadata=row["metadata"],
                embedding_function=self._embedding_function,
            )
            for row in rows
        ]

    def get_collection(self, name: str) -> HttpCollection:
        for collection in self.list_collections():
            if collection.name == name:
                return collection
        raise ValueError(f"Collection '{name}' not found")

    def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> HttpCollection:
        try:
            return self.get_collection(name)
        except ValueError:
            return self.create_collection(name, metadata)

    def delete_collection(self, name: str) -> None:
        self._transport.request(
            "DELETE",
            f"/v1/vector/collections/{_encode_segment(name)}",
        )

    def close(self) -> None:
        self._transport.close()


class AsyncHttpCollection:
    """Async wrapper around `HttpCollection`."""

    def __init__(self, collection: HttpCollection):
        self._collection = collection

    @property
    def name(self) -> str:
        return self._collection.name

    @property
    def metadata(self) -> Dict[str, Any]:
        return self._collection.metadata

    async def add(self, **kwargs: Any) -> None:
        await asyncio.to_thread(self._collection.add, **kwargs)

    async def get(self, **kwargs: Any) -> Dict[str, Any]:
        return await asyncio.to_thread(self._collection.get, **kwargs)

    async def query(self, **kwargs: Any) -> Dict[str, Any]:
        return await asyncio.to_thread(self._collection.query, **kwargs)

    async def update(self, **kwargs: Any) -> None:
        await asyncio.to_thread(self._collection.update, **kwargs)

    async def delete(self, **kwargs: Any) -> None:
        await asyncio.to_thread(self._collection.delete, **kwargs)

    async def count(self) -> int:
        return await asyncio.to_thread(self._collection.count)

    async def peek(self, limit: int = 10) -> Dict[str, Any]:
        return await asyncio.to_thread(self._collection.peek, limit)


class AsyncHttpClient:
    """Async wrapper around `HttpClient`."""

    def __init__(self, **kwargs: Any):
        self._client = HttpClient(**kwargs)

    async def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncHttpCollection:
        collection = await asyncio.to_thread(
            self._client.create_collection, name, metadata
        )
        return AsyncHttpCollection(collection)

    async def get_collection(self, name: str) -> AsyncHttpCollection:
        collection = await asyncio.to_thread(self._client.get_collection, name)
        return AsyncHttpCollection(collection)

    async def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AsyncHttpCollection:
        collection = await asyncio.to_thread(
            self._client.get_or_create_collection, name, metadata
        )
        return AsyncHttpCollection(collection)

    async def list_collections(self) -> List[AsyncHttpCollection]:
        collections = await asyncio.to_thread(self._client.list_collections)
        return [AsyncHttpCollection(item) for item in collections]

    async def delete_collection(self, name: str) -> None:
        await asyncio.to_thread(self._client.delete_collection, name)

    async def close(self) -> None:
        await asyncio.to_thread(self._client.close)

    async def __aenter__(self) -> "AsyncHttpClient":
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        await self.close()
