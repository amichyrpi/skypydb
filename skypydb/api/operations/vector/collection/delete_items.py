"""Mixin that deletes records from a vector collection."""

from typing import Any, Dict, List, Optional


class DeleteItemsMixin:
    """Expose delete behavior on a `Collection` wrapper."""

    def delete(
        self,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, str]] = None,
        by_ids: Optional[List[str]] = None,
        by_metadatas: Optional[Any] = None,
        by_data: Optional[Any] = None,
    ) -> None:
        """Delete items by ID and/or filters."""

        if by_ids is not None:
            if ids is not None and ids != by_ids:
                raise ValueError("Use either 'ids' or legacy 'by_ids', not conflicting values for both.")
            ids = by_ids

        if by_metadatas is not None:
            if where is not None:
                raise ValueError("Use either 'where' or legacy 'by_metadatas', not both.")

            if isinstance(by_metadatas, dict):
                where = by_metadatas
            elif isinstance(by_metadatas, list):
                if len(by_metadatas) == 1 and isinstance(by_metadatas[0], dict):
                    where = by_metadatas[0]
                elif len(by_metadatas) > 1 and all(isinstance(item, dict) for item in by_metadatas):
                    where = {"$or": by_metadatas}
            else:
                raise ValueError("Legacy 'by_metadatas' must be a dict or list of dicts.")

        if by_data is not None:
            if where_document is not None:
                raise ValueError("Use either 'where_document' or legacy 'by_data', not both.")

            if isinstance(by_data, str):
                where_document = {"$contains": by_data}
            elif isinstance(by_data, list):
                by_data_values = [value for value in by_data if isinstance(value, str) and value]
                if len(by_data_values) == 1:
                    where_document = {"$contains": by_data_values[0]}
                elif len(by_data_values) > 1:
                    # Legacy behavior: when multiple texts are provided, delete matches for each text.
                    for text in by_data_values:
                        self._db.delete(
                            collection_name=self._name,
                            ids=ids,
                            where=where,
                            where_document={"$contains": text},
                        )
                    return
            else:
                raise ValueError("Legacy 'by_data' must be a string or list of strings.")

        if ids is None and where is None and where_document is None:
            raise ValueError(
                "delete() requires at least one of 'ids', 'where', or "
                "'where_document' to be provided."
            )

        self._db.delete(
            collection_name=self._name,
            ids=ids,
            where=where,
            where_document=where_document,
        )
