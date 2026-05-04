#!/bin/bash
# ─────────────────────────────────────────────────────────
# Secure-Drop: Trust Certificate Setup
# Run once: bash setup-trust.sh
# ─────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CAROOT=$(mkcert -CAROOT)
CA_CERT="$CAROOT/rootCA.pem"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Secure-Drop Certificate Trust Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Trust on this Mac ──────────────────────────────
echo ""
echo "▶ Step 1: Trusting mkcert CA on this Mac (needs password)..."
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  "$CA_CERT"
echo "✅ Mac trust installed — Chrome/Firefox/Safari will no longer warn."

# ── Step 2: Serve rootCA.pem for iPhone to download ───────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  iPhone Certificate Trust (one-time, 2 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LAN_IP=$(python3 -c "import socket; s=socket.socket(); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || echo "192.168.1.7")
echo ""
echo "  On your iPhone, open Safari and go to:"
echo ""
echo "     http://$LAN_IP:9999/rootCA.pem"
echo ""
echo "  Then follow: Settings → Downloaded Profile → Install"
echo "  Then: Settings → General → About → Certificate Trust Settings"
echo "  And toggle ON 'mkcert …' to fully trust it."
echo ""
echo "  Serving CA cert at http://$LAN_IP:9999 — press Ctrl+C when done."
echo ""

cp "$CA_CERT" /tmp/rootCA.pem
cd /tmp && python3 -m http.server 9999
