import logging
from typing import Dict, List, Optional

from pydantic import BaseModel

try:
    from skypydb import HttpClient
except ImportError as exc:
    raise ImportError(
        "The 'skypydb' library is required. Please install it using 'pip install skypydb'."
    ) from exc

from mem0.vector_stores.base import VectorStoreBase

logger = logging.getLogger(__name__)


class OutputData(BaseModel):
    id: Optional[str]
    score: Optional[float]
    payload: Optional[Dict]


class SkypyDB(VectorStoreBase):
    def __init__(
        self,
        collection_name: str,
        client: Optional[HttpClient] = None,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        if client is not None:
            self.client = client
        else:
            if not api_url:
                raise ValueError("SkypyDB mem0 adapter requires api_url.")
            if not api_key:
                raise ValueError("SkypyDB mem0 adapter requires api_key.")
            self.client = HttpClient(
                api_url=api_url,
                api_key=api_key,
            )

        self.collection_name = collection_name
        self.collection = self.create_col(collection_name)

    def _parse_output(self, data: Dict) -> List[OutputData]:
        ids = data.get("ids", [])
        distances = data.get("distances", [])
        metadatas = data.get("metadatas", [])

        if ids and isinstance(ids[0], list):
            ids = ids[0]
        if distances and isinstance(distances[0], list):
            distances = distances[0]
        if metadatas and isinstance(metadatas[0], list):
            metadatas = metadatas[0]

        results = []
        for index in range(len(ids)):
            results.append(
                OutputData(
                    id=ids[index] if index < len(ids) else None,
                    score=distances[index] if distances and index < len(distances) else None,
                    payload=metadatas[index] if metadatas and index < len(metadatas) else None,
                )
            )
        return results

    def create_col(self, name: str):
        return self.client.get_or_create_collection(name=name)

    def insert(
        self,
        vectors: List[List],
        payloads: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None,
    ):
        if vectors and not isinstance(vectors[0], list):
            vectors = [vectors]

        if ids is None:
            import uuid

            ids = [str(uuid.uuid4()) for _ in vectors]
        elif isinstance(ids, str):
            ids = [ids]

        if payloads is not None and not isinstance(payloads, list):
            payloads = [payloads]

        logger.info("Inserting %s vectors into %s", len(vectors), self.collection_name)
        self.collection.add(ids=ids, embeddings=vectors, metadatas=payloads)

    def search(
        self,
        query: str,
        vectors: List[List],
        limit: int = 5,
        filters: Optional[Dict] = None,
    ) -> List[OutputData]:
        if vectors and not isinstance(vectors[0], list):
            vectors = [vectors]

        where_clause = self._generate_where_clause(filters) if filters else None
        results = self.collection.query(
            query_embeddings=vectors,
            n_results=limit,
            where=where_clause,
        )
        return self._parse_output(results)

    def delete(self, vector_id: str):
        self.collection.delete(ids=[vector_id])

    def update(
        self,
        vector_id: str,
        vector: Optional[List[float]] = None,
        payload: Optional[Dict] = None,
    ):
        embeddings = None
        if vector is not None:
            embeddings = [vector] if not isinstance(vector[0], list) else vector

        self.collection.update(
            ids=[vector_id],
            embeddings=embeddings,
            metadatas=[payload] if payload else None,
        )

    def get(self, vector_id: str) -> OutputData:
        result = self.collection.get(ids=[vector_id], include=["metadatas"])
        parsed = self._parse_output(result)
        if not parsed:
            return OutputData(id=None, score=None, payload=None)
        return parsed[0]

    def list_cols(self) -> List:
        return self.client.list_collections()

    def delete_col(self):
        self.client.delete_collection(name=self.collection_name)

    def col_info(self) -> Dict:
        return {"name": self.collection_name, "count": self.collection.count()}

    def list(self, filters: Optional[Dict] = None, limit: int = 100) -> List[OutputData]:
        where_clause = self._generate_where_clause(filters) if filters else None
        results = self.collection.get(where=where_clause, limit=limit, include=["metadatas"])
        return self._parse_output(results)

    def reset(self):
        logger.warning("Resetting index %s...", self.collection_name)
        self.delete_col()
        self.collection = self.create_col(self.collection_name)

    @staticmethod
    def _generate_where_clause(where: Optional[Dict]) -> Optional[Dict]:
        if where is None:
            return None

        def convert_condition(key: str, value) -> Optional[Dict]:
            if value == "*":
                return None
            if isinstance(value, dict):
                result = {}
                for op, val in value.items():
                    if op == "eq":
                        result[key] = {"$eq": val}
                    elif op == "ne":
                        result[key] = {"$ne": val}
                    elif op == "gt":
                        result[key] = {"$gt": val}
                    elif op == "gte":
                        result[key] = {"$gte": val}
                    elif op == "lt":
                        result[key] = {"$lt": val}
                    elif op == "lte":
                        result[key] = {"$lte": val}
                    elif op == "in":
                        result[key] = {"$in": val}
                    elif op == "nin":
                        result[key] = {"$nin": val}
                    elif op in ["contains", "icontains"]:
                        result[key] = {"$eq": val}
                    else:
                        result[key] = {"$eq": val}
                return result
            return {key: {"$eq": value}}

        processed = []
        for key, value in where.items():
            if key == "$or":
                or_conditions = []
                for condition in value:
                    next_condition = {}
                    for sub_key, sub_value in condition.items():
                        converted = convert_condition(sub_key, sub_value)
                        if converted:
                            next_condition.update(converted)
                    if next_condition:
                        or_conditions.append(next_condition)
                if len(or_conditions) > 1:
                    processed.append({"$or": or_conditions})
                elif or_conditions:
                    processed.append(or_conditions[0])
            elif key != "$not":
                converted = convert_condition(key, value)
                if converted:
                    processed.append(converted)

        if len(processed) == 0:
            return {}
        if len(processed) == 1:
            return processed[0]
        return {"$and": processed}
