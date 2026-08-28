import json
from datetime import datetime
from enum import Enum
from bson import ObjectId

class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to seamlessly handle complex types returned from MongoDB 
    and Python Domain models, ensuring API serialization works universally.
    """
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, Enum):
            return o.value
        # Handle cases where Pydantic models might slip through to raw serialization
        if hasattr(o, "dict"):
            return o.dict()
            
        return super().default(o)
