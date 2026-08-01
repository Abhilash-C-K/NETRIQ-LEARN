import unittest
from backend.auth.roles import Role
from backend.reports.csv_report import stream_csv_report

class TestReports(unittest.IsolatedAsyncioTestCase):
    async def test_csv_streaming_viewer_scrubbing(self):
        """Verify CSV streaming generator scrubs raw IPs for Viewers."""
        
        # Mock generator mimicking DB cursor
        async def mock_cursor():
            yield {
                "timestamp": 1234567890,
                "severity": "high",
                "src_ip": "192.168.1.5",
                "dst_ip": "10.0.0.1",
                "verdict": True
            }
            
        stream = stream_csv_report(Role.VIEWER, mock_cursor())
        
        # Pull headers
        headers = await stream.__anext__()
        self.assertIn("date", headers)
        self.assertNotIn("src_ip", headers)
        
        # Pull first row
        row = await stream.__anext__()
        self.assertIn("Blocked", row) # Template formatted verdict
        self.assertNotIn("192.168.1.5", row) # Raw IP scrubbed

if __name__ == '__main__':
    unittest.main()
