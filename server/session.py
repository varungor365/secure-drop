"""
Secure-Drop — Peer Session Manager
====================================
Maintains in-memory state for all connected peers.

Responsibilities:
  - Assign stable UUIDs to incoming WebSocket connections
  - Track peer metadata (label, device hint, IP)
  - Broadcast peer-joined / peer-left events
  - Expose peer-list snapshots for re-syncing late joiners

No persistence layer — sessions are ephemeral per server run.
"""

import logging
import uuid
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Any
import time

logger = logging.getLogger(__name__)


@dataclass
class PeerRecord:
    """In-memory record for a single connected peer."""

    id: str
    label: str
    device_hint: str
    websocket: Any  # websockets.WebSocketServerProtocol — avoid circular import
    connected: bool = True
    joined_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        """Serialise to JSON-safe dict (excludes the raw WebSocket object)."""
        return {
            "id": self.id,
            "label": self.label,
            "deviceHint": self.device_hint,
            "lastSeen": int(self.joined_at * 1000),
            "connected": self.connected,
        }


class SessionRegistry:
    """
    Thread-safe (asyncio-safe) registry of active peer connections.

    All mutation should happen inside the asyncio event loop; no locking needed
    for single-threaded async operation.
    """

    def __init__(self) -> None:
        self._peers: Dict[str, PeerRecord] = {}

    # ── Registration ─────────────────────────────────────────────────────────

    def register(self, websocket: Any, label: str, device_hint: str) -> PeerRecord:
        """
        Create a new PeerRecord for an incoming WebSocket connection.
        Returns the fully populated record with a freshly minted UUID.
        """
        peer_id = str(uuid.uuid4())
        record = PeerRecord(
            id=peer_id,
            label=label,
            device_hint=device_hint,
            websocket=websocket,
        )
        self._peers[peer_id] = record
        logger.info(f"[Session] Peer registered: {peer_id} ({label})")
        return record

    def deregister(self, peer_id: str) -> Optional[PeerRecord]:
        """Remove a peer on disconnect. Returns the removed record or None."""
        record = self._peers.pop(peer_id, None)
        if record:
            logger.info(f"[Session] Peer deregistered: {peer_id} ({record.label})")
        return record

    # ── Queries ───────────────────────────────────────────────────────────────

    def get(self, peer_id: str) -> Optional[PeerRecord]:
        return self._peers.get(peer_id)

    def get_all(self) -> list[PeerRecord]:
        return list(self._peers.values())

    def get_all_except(self, exclude_id: str) -> list[PeerRecord]:
        return [p for pid, p in self._peers.items() if pid != exclude_id]

    def peer_list_payload(self) -> list[dict]:
        """Snapshot of all peers, serialised for JSON transmission."""
        return [p.to_dict() for p in self._peers.values()]

    def __len__(self) -> int:
        return len(self._peers)
