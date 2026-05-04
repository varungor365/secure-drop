#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Secure-Drop  ·  LAN Launcher
#  Both devices must be on the same Wi-Fi network.
#  Run this once on the host machine — then open the printed URL or
#  scan the QR code from the app on every other device.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PORT_WS=8765
PORT_APP=8080
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Detect LAN IP ─────────────────────────────────────────────────────────────
detect_lan_ip() {
  # Try common macOS Wi-Fi interfaces first, then any active non-loopback
  for iface in en0 en1 en2 wlan0 wlp2s0; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
    if [[ -n "$ip" ]]; then echo "$ip"; return; fi
  done
  # Fallback: first non-loopback IPv4 via hostname
  hostname -I 2>/dev/null | awk '{print $1}' || true
}

LAN_IP=$(detect_lan_ip)

if [[ -z "$LAN_IP" ]]; then
  echo "❌  Could not detect a Wi-Fi IP address."
  echo "    Make sure you are connected to a Wi-Fi network and try again."
  exit 1
fi

SIGNAL_URL="ws://$LAN_IP:$PORT_WS"
APP_URL="http://$LAN_IP:$PORT_APP"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Secure-Drop  ·  LAN Mode                          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf  "║  Wi-Fi IP   : %-47s║\n" "$LAN_IP"
printf  "║  Signaling  : %-47s║\n" "$SIGNAL_URL"
printf  "║  Open URL   : %-47s║\n" "$APP_URL"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Share the URL above OR scan the 📱 QR code inside the app  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Python deps check ─────────────────────────────────────────────────────────
echo "▶ Checking Python dependencies…"
cd "$SCRIPT_DIR/server"
if ! python3 -c "import websockets, zeroconf" 2>/dev/null; then
  echo "  Installing: websockets zeroconf"
  pip3 install -q websockets zeroconf
fi

# ── Start signaling server ────────────────────────────────────────────────────
echo "▶ Starting signaling server on $SIGNAL_URL …"
python3 main.py --host 0.0.0.0 --port "$PORT_WS" &
SERVER_PID=$!
cd "$SCRIPT_DIR"

sleep 1  # give server a moment to bind

# ── Start frontend dev server ─────────────────────────────────────────────────
echo "▶ Starting frontend on $APP_URL …"
VITE_SIGNALING_URL="$SIGNAL_URL" \
  npm run dev -- --host 0.0.0.0 --port "$PORT_APP" &
VITE_PID=$!

echo ""
echo "✅  Both servers are running."
echo "   This device  →  http://localhost:$PORT_APP"
echo "   Other devices →  $APP_URL"
echo ""
echo "   Press Ctrl+C to stop everything."
echo ""

# ── Graceful shutdown ─────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping servers…"
  kill "$SERVER_PID" "$VITE_PID" 2>/dev/null || true
  wait "$SERVER_PID" "$VITE_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

wait
