"""
Secure-Drop — Cloud Signaling Server (Render-compatible)
=========================================================
Single-file entry point for cloud deployment.
Reads PORT from environment (Render injects this automatically).
No mDNS needed — peers discover each other via the public URL.

Local dev:  python3 cloud_main.py
Render:     Start Command = python3 server/cloud_main.py
"""

import asyncio
import json
import logging
import os
import signal
import socket
import sys
import uuid
from typing import Any

import websockets
from websockets.server import WebSocketServerProtocol

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("secure-drop-cloud")

# ── Config ────────────────────────────────────────────────────────────────────

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 8765))   # Render injects $PORT automatically

# ── Peer Registry ─────────────────────────────────────────────────────────────

peers: dict[str, dict] = {}   # peerId → {ws, label, deviceHint, lastSeen}

def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "0.0.0.0"

async def _send(ws: WebSocketServerProtocol, payload: dict) -> None:
    try:
        await ws.send(json.dumps(payload))
    except Exception:
        pass

async def _broadcast(sender_id: str, payload: dict, include_sender: bool = False) -> None:
    tasks = []
    for pid, peer in list(peers.items()):
        if pid == sender_id and not include_sender:
            continue
        tasks.append(_send(peer["ws"], payload))
    if tasks:
        await asyncio.gather(*tasks)

async def _relay(target_id: str, payload: dict) -> None:
    peer = peers.get(target_id)
    if peer:
        await _send(peer["ws"], payload)

# ── Handler ───────────────────────────────────────────────────────────────────

async def handler(ws: WebSocketServerProtocol) -> None:
    peer_id = str(uuid.uuid4())[:8]
    label   = "Unknown"
    logger.info(f"[ws] connect {peer_id}")

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type", "")

            # ── Register ────────────────────────────────────────────────
            if mtype == "register":
                label = msg.get("label", f"Peer-{peer_id}")
                device_hint = msg.get("deviceHint", "")
                peers[peer_id] = {
                    "ws": ws, "label": label,
                    "deviceHint": device_hint, "lastSeen": asyncio.get_event_loop().time()
                }

                # Welcome this peer
                await _send(ws, {
                    "type": "welcome",
                    "peerId": peer_id,
                    "serverLanIp": get_lan_ip(),
                })

                # Send existing peer list
                peer_list = [
                    {"id": pid, "label": p["label"], "deviceHint": p["deviceHint"],
                     "connected": True, "lastSeen": int(p["lastSeen"] * 1000)}
                    for pid, p in peers.items() if pid != peer_id
                ]
                await _send(ws, {"type": "peer-list", "peers": peer_list})

                # Notify others
                await _broadcast(peer_id, {
                    "type": "peer-joined",
                    "peer": {"id": peer_id, "label": label, "deviceHint": device_hint,
                             "connected": True, "lastSeen": int(asyncio.get_event_loop().time() * 1000)},
                })

            # ── Relay messages ──────────────────────────────────────────
            elif mtype in ("offer", "answer", "ice", "transfer-request",
                           "transfer-accepted", "transfer-rejected",
                           "transfer-resume-request", "transfer-resume-accepted",
                           "ecdh-pubkey", "receiver-ready"):
                to_id = msg.get("toPeerId")
                if to_id:
                    await _relay(to_id, {**msg, "fromPeerId": peer_id})

            # ── Ping / keepalive ────────────────────────────────────────
            elif mtype == "ping":
                await _send(ws, {"type": "pong"})

    except websockets.ConnectionClosed:
        pass
    finally:
        peers.pop(peer_id, None)
        logger.info(f"[ws] disconnect {peer_id}  peers={len(peers)}")
        await _broadcast(peer_id, {"type": "peer-left", "peerId": peer_id})


# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    logger.info("=" * 56)
    logger.info("  SecureDrop Cloud Signaling Server")
    logger.info(f"  WebSocket: ws://{HOST}:{PORT}")
    logger.info("=" * 56)

    loop = asyncio.get_running_loop()
    stop = asyncio.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            pass

    async with websockets.serve(handler, HOST, PORT, ping_interval=20, ping_timeout=60):
        logger.info(f"[Signaling] Ready — listening on {HOST}:{PORT}")
        await stop.wait()
    logger.info("[Signaling] Shut down cleanly.")

if __name__ == "__main__":
    asyncio.run(main())
