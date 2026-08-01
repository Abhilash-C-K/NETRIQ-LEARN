import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.database.collections import BaseRepository
from backend.database.exceptions import DocumentNotFoundError, DuplicateKeyError
from pymongo.errors import DuplicateKeyError as MongoDuplicateKeyError

class TestBaseRepository(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Create a repository instance for testing
        self.repo = BaseRepository("test_collection")
        
        # Mock the underlying MongoDB collection
        self.mock_collection = AsyncMock()
        
        # Patch the property to return our mock collection
        patcher = patch('backend.database.collections.BaseRepository.collection', new_callable=lambda: self.mock_collection)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_get_document_success(self):
        """Test retrieving a document successfully."""
        mock_doc = {"_id": "507f1f77bcf86cd799439011", "name": "test"}
        self.mock_collection.find_one.return_value = mock_doc
        
        result = await self.repo.get("507f1f77bcf86cd799439011")
        self.assertEqual(result["id"], "507f1f77bcf86cd799439011")
        self.assertEqual(result["name"], "test")

    async def test_get_document_not_found(self):
        """Test retrieving a non-existent document."""
        self.mock_collection.find_one.return_value = None
        
        with self.assertRaises(DocumentNotFoundError):
            await self.repo.get("507f1f77bcf86cd799439011")

    async def test_create_document_success(self):
        """Test inserting a document."""
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "507f1f77bcf86cd799439011"
        self.mock_collection.insert_one.return_value = mock_insert_result
        
        doc_id = await self.repo.create({"name": "test"})
        self.assertEqual(doc_id, "507f1f77bcf86cd799439011")

    async def test_create_document_duplicate_key(self):
        """Test inserting a document with a duplicate key."""
        self.mock_collection.insert_one.side_effect = MongoDuplicateKeyError("E11000 duplicate key error")
        
        with self.assertRaises(DuplicateKeyError):
            await self.repo.create({"name": "test"})

if __name__ == '__main__':
    unittest.main()
