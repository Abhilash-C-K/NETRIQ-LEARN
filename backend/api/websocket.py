import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from backend.auth.jwt_handler import verify_token
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError
from backend.auth.roles import Role
from backend.websocket.manager import manager
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint. Auth is performed via first-message handshake:
    Client must send: {"type": "auth", "token": "<access_token>"} within 5 seconds.
    This prevents token leakage in URLs/logs and protects against socket exhaustion DoS.
    """
    # Wait for auth handshake message with a strict 5.0-second timeout
    try:
        auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("WebSocket auth failed: Handshake timed out after 5 seconds")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    except Exception:
        logger.warning("WebSocket auth failed: Invalid JSON in handshake")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if not auth_msg or auth_msg.get("type") != "auth" or not auth_msg.get("token"):
        logger.warning("WebSocket: missing or malformed auth handshake")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = verify_token(auth_msg["token"], expected_type="access")
    except (TokenExpiredError, InvalidTokenError):
        logger.warning("WebSocket auth failed: Invalid or expired token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub")
    role_str = payload.get("role", "viewer")

    try:
        role = Role(role_str)
    except ValueError:
        logger.warning(f"WebSocket auth failed: unknown role '{role_str}'")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Register with the canonical role-aware ConnectionManager
    await manager.connect(user_id, role, websocket)
    logger.info(f"WebSocket connected: user={user_id} role={role.value}")

    # Confirm auth success to client
    await websocket.send_json({"type": "auth_ok", "user_id": user_id, "role": role.value})

    try:
        while True:
            # Keep-alive: echo pings, ignore everything else
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await manager.disconnect(user_id, role, websocket)
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(user_id, role, websocket)
