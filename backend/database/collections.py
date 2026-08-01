from typing import Any, Dict, List, Optional
from bson import ObjectId
from backend.database.database import DatabaseManager
from backend.database.exceptions import DocumentNotFoundError
from pymongo.errors import DuplicateKeyError as MongoDuplicateKeyError
from backend.database.exceptions import DuplicateKeyError

class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def collection(self):
        return DatabaseManager.get_db()[self.collection_name]

    def _prepare_doc(self, doc: dict) -> dict:
        """Removes None values and converts id string to ObjectId if necessary."""
        return {k: v for k, v in doc.items() if v is not None}

    def _format_out(self, doc: dict) -> Optional[dict]:
        """Converts ObjectId to string for Pydantic compatibility."""
        if not doc:
            return None
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def get(self, doc_id: str) -> dict:
        """Retrieves a single document by ID."""
        try:
            obj_id = ObjectId(doc_id)
        except Exception:
            raise DocumentNotFoundError(f"Invalid ID format: {doc_id}")
            
        doc = await self.collection.find_one({"_id": obj_id})
        if not doc:
            raise DocumentNotFoundError(f"Document with ID {doc_id} not found in {self.collection_name}")
        return self._format_out(doc)

    async def create(self, data: dict) -> str:
        """Inserts a new document."""
        clean_data = self._prepare_doc(data)
        # Remove 'id' if passed, MongoDB uses '_id'
        clean_data.pop("id", None) 
        
        try:
            result = await self.collection.insert_one(clean_data)
            return str(result.inserted_id)
        except MongoDuplicateKeyError as e:
            raise DuplicateKeyError(f"Duplicate key error inserting into {self.collection_name}") from e

    async def update(self, doc_id: str, data: dict) -> bool:
        """Updates a document by ID."""
        try:
            obj_id = ObjectId(doc_id)
        except Exception:
            raise DocumentNotFoundError(f"Invalid ID format: {doc_id}")

        clean_data = self._prepare_doc(data)
        clean_data.pop("id", None)
        clean_data.pop("_id", None)

        if not clean_data:
            return False

        try:
            result = await self.collection.update_one(
                {"_id": obj_id}, 
                {"$set": clean_data}
            )
            if result.matched_count == 0:
                raise DocumentNotFoundError(f"Document with ID {doc_id} not found in {self.collection_name}")
            return result.modified_count > 0
        except MongoDuplicateKeyError as e:
            raise DuplicateKeyError(f"Duplicate key error updating {self.collection_name}") from e

    async def delete(self, doc_id: str) -> bool:
        """Deletes a document by ID."""
        try:
            obj_id = ObjectId(doc_id)
        except Exception:
            raise DocumentNotFoundError(f"Invalid ID format: {doc_id}")

        result = await self.collection.delete_one({"_id": obj_id})
        if result.deleted_count == 0:
            raise DocumentNotFoundError(f"Document with ID {doc_id} not found in {self.collection_name}")
        return True

    async def list(self, filter_query: dict = None, limit: int = 50, skip: int = 0, sort_by: list = None) -> List[dict]:
        """Lists documents matching the filter."""
        query = filter_query or {}
        cursor = self.collection.find(query).skip(skip).limit(limit)
        
        if sort_by:
            cursor = cursor.sort(sort_by)
            
        docs = await cursor.to_list(length=limit)
        return [self._format_out(doc) for doc in docs]

class ThreatRepository(BaseRepository):
    """Specialized repository for high-volume Layer 1 threats/flows."""
    def __init__(self):
        super().__init__("threats")

    async def get_dashboard_stats(self, time_range_start: float, time_range_end: float, severity: str = None) -> List[dict]:
        """
        Specialized method leveraging the compound index for the dashboard.
        Query matches order: timestamp -> severity -> src_ip (implied).
        """
        query = {
            "timestamp": {"$gte": time_range_start, "$lte": time_range_end}
        }
        if severity:
            query["severity"] = severity
            
        # Example aggregation or just raw pull
        cursor = self.collection.find(query).sort("timestamp", -1).limit(100)
        docs = await cursor.to_list(length=100)
        return [self._format_out(doc) for doc in docs]

# Expose instantiated repositories to be imported by services
threats_repo = ThreatRepository()
incidents_repo = BaseRepository("incidents")
responses_repo = BaseRepository("responses")
users_repo = BaseRepository("users")
feedback_repo = BaseRepository("feedback")
reports_repo = BaseRepository("reports")
settings_repo = BaseRepository("settings")
