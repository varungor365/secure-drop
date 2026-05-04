"""
Secure-Drop — Server Entry Point
==================================
Concurrently launches:
  1. mDNS advertisement (zeroconf) — LAN auto-discovery
  2. WebSocket signaling server (websockets) — WebRTC bootstrap

Both run inside a single asyncio event loop via asyncio.gather.
Graceful shutdown on SIGINT / SIGTERM.

Usage:
    python main.py [--host 0.0.0.0] [--port 8765]
"""

import asyncio
import argparse
import logging
import signal
import sys

from discovery import DiscoveryService
from signaling import start_signaling_server

# ── Logging Configuration ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("secure-drop")


# ── CLI Arguments ─────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Secure-Drop Signaling & Discovery Server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--host", default="0.0.0.0", help="Bind address for WebSocket server")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket server port")
    return parser.parse_args()


# ── Main Async Entry Point ────────────────────────────────────────────────────

async def main(host: str, port: int) -> None:
    """Start mDNS discovery and WebSocket signaling server concurrently."""

    logger.info("=" * 60)
    logger.info("  Secure-Drop Signaling Server")
    logger.info(f"  WebSocket : ws://{host}:{port}")
    logger.info(f"  mDNS      : _secure-drop._tcp.local.")
    logger.info("=" * 60)

    # Initialise mDNS service advertisement.
    discovery = DiscoveryService(port=port)

    # Set up graceful shutdown on SIGINT / SIGTERM.
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def _request_shutdown(sig_name: str) -> None:
        logger.info(f"[Main] Received {sig_name} — initiating graceful shutdown")
        shutdown_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, lambda s=sig.name: _request_shutdown(s))
        except NotImplementedError:
            # Windows does not support add_signal_handler for all signals.
            pass

    # Launch mDNS and signaling concurrently.
    async def run_with_shutdown() -> None:
        await discovery.start()
        try:
            signaling_task = asyncio.create_task(
                start_signaling_server(host, port),
                name="signaling-server",
            )
            shutdown_task = asyncio.create_task(
                shutdown_event.wait(),
                name="shutdown-watcher",
            )
            # Block until either the server errors or shutdown is requested.
            done, pending = await asyncio.wait(
                {signaling_task, shutdown_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        finally:
            await discovery.stop()
            logger.info("[Main] Server shut down cleanly.")

    await run_with_shutdown()


if __name__ == "__main__":
    args = parse_args()
    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        pass
