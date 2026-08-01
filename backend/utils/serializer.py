import json
from datetime import datetime
from enum import Enum
from bson import ObjectId

class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to seamlessly handle complex types returned from MongoDB 
    and Python Domain models, ensuring API serialization works universally.
    """
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Enum):
            return obj.value
        # Handle cases where Pydantic models might slip through to raw serialization
        if hasattr(obj, "dict"):
            return obj.dict()
            
        return super().default(obj)
