"""
Secure-Drop — mDNS Service Discovery
=====================================
Advertises the signaling server as a zero-configuration mDNS service
on the local network using the _secure-drop._tcp.local. service type.

Any device with a mDNS-capable browser/OS on the same Wi-Fi
will be able to locate the signaling server without manual IP entry.

RFC 6762 — Multicast DNS
RFC 6763 — DNS-Based Service Discovery
"""

import asyncio
import logging
import socket
from typing import Optional

from zeroconf import ServiceInfo, Zeroconf
from zeroconf.asyncio import AsyncZeroconf

logger = logging.getLogger(__name__)

# mDNS service type for Secure-Drop
SERVICE_TYPE = "_secure-drop._tcp.local."
SERVICE_NAME = "SecureDrop._secure-drop._tcp.local."


class DiscoveryService:
    """
    Manages mDNS advertisement of the Secure-Drop signaling server.

    Lifecycle:
        await ds.start()   # begin advertising
        await ds.stop()    # clean deregistration on shutdown
    """

    def __init__(self, port: int, hostname: str = "") -> None:
        self._port = port
        self._hostname = hostname or socket.gethostname()
        self._zc: Optional[AsyncZeroconf] = None
        self._service_info: Optional[ServiceInfo] = None

    def _resolve_local_ip(self) -> str:
        """Determine the primary LAN IP address of this machine."""
        try:
            # Connect to a non-routable address; the OS fills in the source IP.
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.connect(("8.8.8.8", 80))
                return sock.getsockname()[0]
        except OSError:
            return "127.0.0.1"

    async def start(self) -> None:
        """Register this machine as a Secure-Drop signaling node on mDNS."""
        local_ip = self._resolve_local_ip()
        logger.info(f"[mDNS] Advertising signaling server at {local_ip}:{self._port}")

        self._service_info = ServiceInfo(
            type_=SERVICE_TYPE,
            name=SERVICE_NAME,
            addresses=[socket.inet_aton(local_ip)],
            port=self._port,
            properties={
                "version": "1.0",
                "host": self._hostname,
                "proto": "ws",
            },
            server=f"{self._hostname}.local.",
        )

        self._zc = AsyncZeroconf()
        try:
            await self._zc.async_register_service(self._service_info, allow_name_change=True)
        except Exception:
            await self._zc.async_register_service(self._service_info)
        logger.info("[mDNS] Service registered successfully")

    async def stop(self) -> None:
        """Gracefully deregister the mDNS service on shutdown."""
        if self._zc and self._service_info:
            await self._zc.async_unregister_service(self._service_info)
            await self._zc.async_close()
            logger.info("[mDNS] Service deregistered")
