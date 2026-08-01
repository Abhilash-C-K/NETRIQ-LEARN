import unittest
import json
from datetime import datetime, timezone
from bson import ObjectId
from backend.utils.serializer import CustomJSONEncoder
from backend.utils.validators import validate_ip, validate_mac, validate_email
from backend.utils.constants import Role

class TestUtils(unittest.TestCase):
    def test_json_serializer(self):
        """Verify custom encoder handles MongoDB ObjectIds and Datetimes."""
        obj_id = ObjectId()
        dt = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        
        data = {
            "_id": obj_id,
            "created_at": dt,
            "role": Role.ANALYST,
            "nested": {"id": obj_id}
        }
        
        json_str = json.dumps(data, cls=CustomJSONEncoder)
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["_id"], str(obj_id))
        self.assertEqual(parsed["created_at"], "2023-01-01T12:00:00+00:00")
        self.assertEqual(parsed["role"], "analyst")
        self.assertEqual(parsed["nested"]["id"], str(obj_id))

    def test_validators(self):
        """Verify standard data validators."""
        self.assertTrue(validate_ip("192.168.1.1"))
        self.assertFalse(validate_ip("256.256.256.256"))
        
        self.assertTrue(validate_mac("00:1A:2B:3C:4D:5E"))
        self.assertFalse(validate_mac("00-1A-2B-3C-4D-5E")) # Enforces colons based on our strict regex
        
        self.assertTrue(validate_email("test@netriq.io"))
        self.assertFalse(validate_email("invalid-email"))

if __name__ == '__main__':
    unittest.main()
