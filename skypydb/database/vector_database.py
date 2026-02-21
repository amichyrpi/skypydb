"""Manage SQLite-backed vector collections and vector similarity search."""

import sqlite3
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from skypydb.database.operations.vector import (
    AddItemsMixin,
    CollectionAuditMixin,
    CountItemsMixin,
    CreateCollectionMixin,
    DeleteCollectionMixin,
    DeleteItemsMixin,
    EmbeddingFunctionMixin,
    GetCollectionMixin,
    GetItemsMixin,
    QueryItemsMixin,
    UpdateItemsMixin,
)
from skypydb.logging.logger_service import LoggerService


class VectorDatabase(
    EmbeddingFunctionMixin,
    AddItemsMixin,
    UpdateItemsMixin,
    QueryItemsMixin,
    GetItemsMixin,
    DeleteItemsMixin,
    CollectionAuditMixin,
    CreateCollectionMixin,
    GetCollectionMixin,
    CountItemsMixin,
    DeleteCollectionMixin,
):
    """Manage a SQLite-backed vector database."""

    def __init__(
        self,
        path: str,
        embedding_function: Optional[Callable[[List[str]], List[List[float]]]] = None,
    ):
        """Initialize the vector database connection, metadata, and logger service."""

        self.path = path
        self.embedding_function = embedding_function

        Path(path).parent.mkdir(parents=True, exist_ok=True)

        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

        self._ensure_collections_table()

        self._logger_service = LoggerService(db_path=self.path)
        initialized_at = self._utcnow_iso()
        self._record_operation(
            operation="initialize",
            status="success",
            details={"db_path": self.path},
            duration_ms=0,
            refresh_snapshot=True,
            operation_at=initialized_at,
        )

    @staticmethod
    def _utcnow_iso() -> str:
        """Return UTC timestamp formatted for log and snapshot persistence."""

        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _duration_ms(start_time: float) -> int:
        """Convert perf counter delta to integer milliseconds."""

        return int((time.perf_counter() - start_time) * 1000)

    def _collection_has_metadata(self, collection_name: str) -> bool:
        """
        Return whether the collection metadata field exists in storage.

        Collections always persist a metadata JSON object (including `{}`),
        so this reflects stored state instead of just call-time input args.
        """

        try:
            collection = GetCollectionMixin.get_collection(self, name=collection_name)
            return (
                collection is not None
                and "metadata" in collection
                and collection["metadata"] is not None
            )
        except Exception:
            return False

    def _record_operation(
        self,
        operation: str,
        status: str,
        details: Dict[str, Any],
        collection: Optional[str] = None,
        duration_ms: Optional[int] = None,
        error: Optional[str] = None,
        refresh_snapshot: bool = False,
        operation_at: Optional[str] = None,
    ) -> None:
        """Record a DB operation in log.txt and dbstat.sqlite3 (best effort)."""

        try:
            self._logger_service.log_event(
                operation=operation,
                status=status,
                details=details,
                collection=collection,
                duration_ms=duration_ms,
                error=error,
            )

            if refresh_snapshot:
                self._logger_service.refresh_full_snapshot(
                    vector_conn=self.conn,
                    last_operation=operation,
                    last_status=status,
                    last_collection=collection,
                    last_operation_at=operation_at,
                )
            else:
                self._logger_service.update_last_operation_only(
                    operation=operation,
                    status=status,
                    collection=collection,
                    operation_at=operation_at,
                )
        except Exception as exc:  # noqa: BLE001 - logger is explicitly best effort
            warnings.warn(
                f"Logger operation recording failed: {exc}",
                RuntimeWarning,
                stacklevel=2,
            )

    def create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Create a collection and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            CreateCollectionMixin.create_collection(self, name=name, metadata=metadata)
        except Exception as exc:
            self._record_operation(
                operation="create_collection",
                status="error",
                details={"has_metadata": False},
                collection=name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        has_metadata = self._collection_has_metadata(name)
        self._record_operation(
            operation="create_collection",
            status="success",
            details={"has_metadata": has_metadata},
            collection=name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=True,
            operation_at=operation_at,
        )

    def get_collection(self, name: str) -> Optional[Dict[str, Any]]:
        """Get collection metadata and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            result = GetCollectionMixin.get_collection(self, name=name)
        except Exception as exc:
            self._record_operation(
                operation="get_collection",
                status="error",
                details={},
                collection=name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="get_collection",
            status="success",
            details={"found": result is not None},
            collection=name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
        return result

    def get_or_create_collection(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Get or create a collection and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()
        created = False

        try:
            result = GetCollectionMixin.get_collection(self, name=name)
            if result is None:
                CreateCollectionMixin.create_collection(self, name=name, metadata=metadata)
                created = True
                result = GetCollectionMixin.get_collection(self, name=name)
            assert result is not None
        except Exception as exc:
            self._record_operation(
                operation="get_or_create_collection",
                status="error",
                details={"created": created, "has_metadata": False},
                collection=name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        has_metadata = result.get("metadata") is not None
        self._record_operation(
            operation="get_or_create_collection",
            status="success",
            details={"created": created, "has_metadata": has_metadata},
            collection=name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=created,
            operation_at=operation_at,
        )
        return result

    def list_collections(self) -> List[Dict[str, Any]]:
        """List collections and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            collections = GetCollectionMixin.list_collections(self)
        except Exception as exc:
            self._record_operation(
                operation="list_collections",
                status="error",
                details={},
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="list_collections",
            status="success",
            details={"collections_count": len(collections)},
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
        return collections

    def count(self, collection_name: str) -> int:
        """Count collection records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            document_count = CountItemsMixin.count(self, collection_name=collection_name)
        except Exception as exc:
            self._record_operation(
                operation="count",
                status="error",
                details={},
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="count",
            status="success",
            details={"document_count": document_count},
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
        return document_count

    def add(
        self,
        collection_name: str,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """Add records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            added_ids = AddItemsMixin.add(
                self,
                collection_name=collection_name,
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
            )
        except Exception as exc:
            self._record_operation(
                operation="add",
                status="error",
                details={
                    "ids_count": len(ids),
                    "embeddings_provided": embeddings is not None,
                    "documents_provided": documents is not None,
                    "metadatas_provided": metadatas is not None,
                },
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="add",
            status="success",
            details={
                "ids_count": len(ids),
                "added_count": len(added_ids),
                "embeddings_provided": embeddings is not None,
                "documents_provided": documents is not None,
                "metadatas_provided": metadatas is not None,
            },
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=True,
            operation_at=operation_at,
        )
        return added_ids

    def update(
        self,
        collection_name: str,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Update records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            UpdateItemsMixin.update(
                self,
                collection_name=collection_name,
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
            )
        except Exception as exc:
            self._record_operation(
                operation="update",
                status="error",
                details={
                    "ids_count": len(ids),
                    "embeddings_provided": embeddings is not None,
                    "documents_provided": documents is not None,
                    "metadatas_provided": metadatas is not None,
                },
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="update",
            status="success",
            details={
                "ids_count": len(ids),
                "embeddings_provided": embeddings is not None,
                "documents_provided": documents is not None,
                "metadatas_provided": metadatas is not None,
            },
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=True,
            operation_at=operation_at,
        )

    def query(
        self,
        collection_name: str,
        query_embeddings: Optional[List[List[float]]] = None,
        query_texts: Optional[List[str]] = None,
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, List[List[Any]]]:
        """Query records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()
        query_count = len(query_embeddings or query_texts or [])

        try:
            results = QueryItemsMixin.query(
                self,
                collection_name=collection_name,
                query_embeddings=query_embeddings,
                query_texts=query_texts,
                n_results=n_results,
                where=where,
                where_document=where_document,
                include=include,
            )
        except Exception as exc:
            self._record_operation(
                operation="query",
                status="error",
                details={
                    "query_count": query_count,
                    "n_results": n_results,
                    "has_where": where is not None,
                    "has_where_document": where_document is not None,
                },
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        returned_count = sum(len(ids_batch) for ids_batch in results.get("ids", []))
        self._record_operation(
            operation="query",
            status="success",
            details={
                "query_count": query_count,
                "n_results": n_results,
                "returned_count": returned_count,
                "has_where": where is not None,
                "has_where_document": where_document is not None,
            },
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
        return results

    def get(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        include: Optional[List[str]] = None,
    ) -> Dict[str, List[Any]]:
        """Get records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()
        ids_count = len(ids) if ids is not None else 0

        try:
            results = GetItemsMixin.get(
                self,
                collection_name=collection_name,
                ids=ids,
                where=where,
                where_document=where_document,
                include=include,
            )
        except Exception as exc:
            self._record_operation(
                operation="get",
                status="error",
                details={
                    "ids_count": ids_count,
                    "has_where": where is not None,
                    "has_where_document": where_document is not None,
                },
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="get",
            status="success",
            details={
                "ids_count": ids_count,
                "returned_count": len(results.get("ids", [])),
                "has_where": where is not None,
                "has_where_document": where_document is not None,
            },
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
        return results

    def delete(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
    ) -> int:
        """Delete records and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()
        ids_count = len(ids) if ids is not None else 0

        try:
            deleted_count = DeleteItemsMixin.delete(
                self,
                collection_name=collection_name,
                ids=ids,
                where=where,
                where_document=where_document,
            )
        except Exception as exc:
            self._record_operation(
                operation="delete",
                status="error",
                details={
                    "ids_count": ids_count,
                    "has_where": where is not None,
                    "has_where_document": where_document is not None,
                },
                collection=collection_name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="delete",
            status="success",
            details={
                "ids_count": ids_count,
                "deleted_count": deleted_count,
                "has_where": where is not None,
                "has_where_document": where_document is not None,
            },
            collection=collection_name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=True,
            operation_at=operation_at,
        )
        return deleted_count

    def delete_collection(self, name: str) -> None:
        """Delete collection and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            DeleteCollectionMixin.delete_collection(self, name=name)
        except Exception as exc:
            self._record_operation(
                operation="delete_collection",
                status="error",
                details={},
                collection=name,
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="delete_collection",
            status="success",
            details={},
            collection=name,
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=True,
            operation_at=operation_at,
        )

    def close(self) -> None:
        """Close the SQLite connection and record operation telemetry."""

        start_time = time.perf_counter()
        operation_at = self._utcnow_iso()

        try:
            if self.conn:
                self.conn.close()
        except Exception as exc:
            self._record_operation(
                operation="close",
                status="error",
                details={},
                duration_ms=self._duration_ms(start_time),
                error=str(exc),
                refresh_snapshot=False,
                operation_at=operation_at,
            )
            raise

        self._record_operation(
            operation="close",
            status="success",
            details={},
            duration_ms=self._duration_ms(start_time),
            refresh_snapshot=False,
            operation_at=operation_at,
        )
