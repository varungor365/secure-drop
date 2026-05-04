"""
Secure-Drop — WebSocket Signaling Server
==========================================
Implements the signaling protocol that bootstraps WebRTC peer connections.

Responsibilities (signaling server only — no file data ever passes through):
  1. Peer registration — assign UUID, broadcast peer-joined to others
  2. SDP offer / answer relay — forward between specific peer pairs
  3. ICE candidate relay — forward between specific peer pairs
  4. Transfer-request / accepted / rejected relay
  5. Peer-left broadcast on disconnect

Message format: JSON over WebSocket (RFC 6455)
Server port: 8765 (configurable via WS_PORT env var)

CORS: Accepts connections from any origin (LAN-only deployment).
"""

import asyncio
import json
import logging
import os
import socket
from typing import Any

import websockets
from websockets.server import WebSocketServerProtocol

from session import SessionRegistry

logger = logging.getLogger(__name__)

# Global peer registry — shared across all WebSocket handler coroutines.
registry = SessionRegistry()

def get_lan_ip() -> str:
    """Retrieve the primary local IP address of the host machine."""
    try:
        # Create a dummy UDP socket to 8.8.8.8 to force OS to select the active outbound interface
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


async def _send_json(ws: WebSocketServerProtocol, payload: dict) -> None:
    """Serialise and send a JSON payload, ignoring closed-connection errors."""
    try:
        await ws.send(json.dumps(payload))
    except websockets.ConnectionClosed:
        pass


async def _broadcast(
    sender_id: str,
    payload: dict,
    *,
    include_sender: bool = False,
) -> None:
    """
    Broadcast a JSON payload to all registered peers.

    Args:
        sender_id:      The peer originating the message.
        payload:        JSON-serialisable dict to send.
        include_sender: Whether to echo back to the sender (default: False).
    """
    targets = (
        registry.get_all()
        if include_sender
        else registry.get_all_except(sender_id)
    )
    if not targets:
        return
    await asyncio.gather(*[_send_json(p.websocket, payload) for p in targets])


async def _relay(
    target_peer_id: str,
    payload: dict,
) -> None:
    """Forward a message to exactly one peer by ID."""
    target = registry.get(target_peer_id)
    if target:
        await _send_json(target.websocket, payload)
    else:
        logger.warning(f"[Relay] Target peer not found: {target_peer_id}")


# ── Message Handlers ──────────────────────────────────────────────────────────

async def _handle_register(
    ws: WebSocketServerProtocol,
    data: dict,
) -> str:
    """
    Register a new peer and notify existing peers of the arrival.
    Returns the newly assigned peer_id.
    """
    label = data.get("label", "Unknown Device")[:64]
    device_hint = data.get("deviceHint", "Browser")[:128]

    record = registry.register(ws, label, device_hint)

    # 1. Confirm registration to the new peer with their assigned ID.
    await _send_json(ws, {
        "type": "welcome",
        "peerId": record.id,
        "serverLanIp": get_lan_ip(),
        "peers": registry.get_all_except(record.id) and
                 [p.to_dict() for p in registry.get_all_except(record.id)],
    })

    # Correct the above quirk — send peer-list cleanly.
    await _send_json(ws, {
        "type": "peer-list",
        "peers": [p.to_dict() for p in registry.get_all_except(record.id)],
    })

    # 2. Notify all existing peers about the newcomer.
    await _broadcast(record.id, {
        "type": "peer-joined",
        "peer": record.to_dict(),
    })

    logger.info(f"[Signaling] Peer joined: {record.id} ({label}) — {len(registry)} total")
    return record.id


async def _handle_offer(peer_id: str, data: dict) -> None:
    """Forward an SDP offer to the specified target peer."""
    await _relay(data["toPeerId"], {
        "type": "offer",
        "fromPeerId": peer_id,
        "sdp": data["sdp"],
    })


async def _handle_answer(peer_id: str, data: dict) -> None:
    """Forward an SDP answer to the offer originator."""
    await _relay(data["toPeerId"], {
        "type": "answer",
        "fromPeerId": peer_id,
        "sdp": data["sdp"],
    })


async def _handle_ice(peer_id: str, data: dict) -> None:
    """Forward an ICE candidate to the specified peer."""
    await _relay(data["toPeerId"], {
        "type": "ice",
        "fromPeerId": peer_id,
        "candidate": data["candidate"],
    })


async def _handle_transfer_request(peer_id: str, data: dict) -> None:
    """Relay a file transfer request (metadata only) to the target peer."""
    await _relay(data["toPeerId"], {
        "type": "transfer-request",
        "fromPeerId": peer_id,
        "meta": data["meta"],
    })


async def _handle_transfer_response(peer_id: str, data: dict) -> None:
    """Relay transfer-accepted or transfer-rejected back to the sender."""
    msg_type = data["type"]  # "transfer-accepted" | "transfer-rejected"
    await _relay(data["toPeerId"], {
        "type": msg_type,
        "fromPeerId": peer_id,
    })

async def _handle_resume_request(peer_id: str, data: dict) -> None:
    await _relay(data["toPeerId"], {
        "type": "transfer-resume-request",
        "fromPeerId": peer_id,
        "transferId": data["transferId"]
    })

async def _handle_resume_accepted(peer_id: str, data: dict) -> None:
    await _relay(data["toPeerId"], {
        "type": "transfer-resume-accepted",
        "fromPeerId": peer_id,
        "chunksReceived": data["chunksReceived"]
    })


async def _handle_ecdh_pubkey(peer_id: str, data: dict) -> None:
    """Relay an ECDH public key (JWK) to the target peer for session key derivation."""
    await _relay(data["toPeerId"], {
        "type": "ecdh-pubkey",
        "fromPeerId": peer_id,
        "publicKeyJwk": data["publicKeyJwk"],
    })


async def _handle_update_label(peer_id: str, data: dict) -> None:
    """Update a peer's label and broadcast the change to all other peers."""
    new_label = str(data.get("label", ""))[:64]
    if not new_label:
        return
    peer = registry.get(peer_id)
    if peer:
        peer.label = new_label
        logger.info(f"[Signaling] Peer {peer_id} changed label to '{new_label}'")
        await _broadcast(peer_id, {
            "type": "peer-updated",
            "peer": peer.to_dict(),
        })


# ── Main Handler ──────────────────────────────────────────────────────────────

HANDLERS = {
    "offer": _handle_offer,
    "answer": _handle_answer,
    "ice": _handle_ice,
    "ecdh-pubkey": _handle_ecdh_pubkey,
    "update-label": _handle_update_label,
    "transfer-request": _handle_transfer_request,
    "transfer-accepted": _handle_transfer_response,
    "transfer-rejected": _handle_transfer_response,
    "transfer-resume-request": _handle_resume_request,
    "transfer-resume-accepted": _handle_resume_accepted,
}


async def peer_handler(ws: WebSocketServerProtocol) -> None:
    """
    Lifecycle handler for one WebSocket peer connection.

    Registration happens on the first message which must be type "register".
    All subsequent messages are routed by their "type" field.
    """
    peer_id: str | None = None

    try:
        async for raw in ws:
            try:
                data: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("[Signaling] Received non-JSON message — ignoring")
                continue

            msg_type: str = data.get("type", "")

            # ── First message must register the peer ──
            if peer_id is None:
                if msg_type == "register":
                    peer_id = await _handle_register(ws, data)
                else:
                    logger.warning("[Signaling] Unregistered peer sent non-register message")
                continue

            # ── Route subsequent messages ──
            handler = HANDLERS.get(msg_type)
            if handler:
                await handler(peer_id, data)
            else:
                logger.debug(f"[Signaling] Unknown message type: {msg_type}")

    except websockets.ConnectionClosedError:
        pass
    finally:
        if peer_id:
            registry.deregister(peer_id)
            await _broadcast(peer_id, {
                "type": "peer-left",
                "peerId": peer_id,
            })
            logger.info(f"[Signaling] Peer disconnected: {peer_id} — {len(registry)} remaining")


async def start_signaling_server(host: str = "0.0.0.0", port: int = 8765) -> None:
    """Start the WebSocket signaling server and run indefinitely."""
    logger.info(f"[Signaling] Server starting on ws://{host}:{port}")
    async with websockets.serve(peer_handler, host, port):
        logger.info(f"[Signaling] Server ready — accepting connections")
        await asyncio.Future()  # run forever
