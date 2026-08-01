import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.database.collections import ThreatRepository

class TestDashboardQueries(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.repo = ThreatRepository()
        self.mock_collection = AsyncMock()
        
        patcher = patch('backend.database.collections.BaseRepository.collection', new_callable=lambda: self.mock_collection)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_get_dashboard_stats_filter_construction(self):
        """
        Integration test verifying that the repository correctly constructs
        MongoDB filters based on the compound index parameters.
        """
        # Mock cursor chaining: find().sort().limit()
        mock_cursor = AsyncMock()
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor
        mock_cursor.to_list.return_value = [
            {"_id": "1", "timestamp": 100, "severity": "HIGH", "src_ip": "1.1.1.1"}
        ]
        self.mock_collection.find.return_value = mock_cursor

        # Execute
        results = await self.repo.get_dashboard_stats(
            time_range_start=50.0,
            time_range_end=150.0,
            severity="HIGH"
        )

        # Assert correct filter query was sent to PyMongo
        self.mock_collection.find.assert_called_once_with({
            "timestamp": {"$gte": 50.0, "$lte": 150.0},
            "severity": "HIGH"
        })
        
        # Assert format output handled ObjectId correctly
        self.assertEqual(results[0]["id"], "1")
        self.assertEqual(results[0]["severity"], "HIGH")

if __name__ == '__main__':
    unittest.main()
