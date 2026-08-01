from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from backend.auth.jwt_handler import verify_token
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """
    WebSocket endpoint. Uses query parameter for auth since browser WS API 
    does not support custom headers easily.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        payload = verify_token(token, expected_type="access")
    except (TokenExpiredError, InvalidTokenError):
        logger.warning("WebSocket auth failed: Invalid or expired token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub")
    await manager.connect(websocket)
    logger.info(f"WebSocket client connected: user_id={user_id}")
    
    try:
        while True:
            # We just wait for disconnects or incoming keepalives
            data = await websocket.receive_text()
            # If client sends anything, just echo or ignore
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket client disconnected: user_id={user_id}")
