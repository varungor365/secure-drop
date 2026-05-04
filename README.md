# 🔒 Secure-Drop

![Build](https://img.shields.io/badge/build-passing-34d399?style=flat-square)
![Platform](https://img.shields.io/badge/platform-any%20browser-22d3ee?style=flat-square)
![Encryption](https://img.shields.io/badge/encryption-AES--256--GCM-818cf8?style=flat-square)
![Zero Relay](https://img.shields.io/badge/relay-zero-f1f5f9?style=flat-square&labelColor=0d1f35)
![License](https://img.shields.io/badge/license-MIT-fbbf24?style=flat-square)

> **Zero-relay, end-to-end encrypted peer-to-peer file transfer — from any device to any device.**  
> No cloud upload. No accounts. No file size limits imposed by a server. Files travel directly between browsers, encrypted before they leave the sender.

---

## ✨ Features

- **True P2P** — WebRTC DataChannel transfers files device-to-device; the signaling server is only a matchmaker and never sees file content
- **AES-256-GCM encryption** — every chunk encrypted independently before leaving the sender's machine
- **ECDH P-256 key exchange** — ephemeral keys negotiated per session; no pre-shared secrets
- **HKDF-SHA-256 key derivation** — raw ECDH bits stretched into a 256-bit AES key
- **SHA-256 integrity verification** — full file hash checked on receipt
- **MITM fingerprint** — 8-character session fingerprint both peers can read aloud to verify no interception
- **Drag & Drop + Click to browse** — always-active file zone, `⌘O` keyboard shortcut
- **QR code join** — scan to connect a second device instantly; URL encodes the signaling server
- **Dark / Light mode** — sci-fi dark (default) + clean light theme
- **Real-time transfer stats** — speed (MB/s), progress bar, CPU %, memory, uptime
- **Transfer history** — completed and failed transfers with details
- **Editable device name** — personalise your node label
- **Platform independent** — runs in any modern browser on Mac, Windows, Linux, iOS, Android
- **LAN mode** — single `./start-lan.sh` launches everything, zero config
- **Internet mode** — deploy frontend to Netlify + signaling to Railway (both free)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser  A                                │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │SignalingC│  │PeerConnect │  │ChunkTransfer│  │CryptoSvc  │  │
│  │  (WS)   │  │ (WebRTC)   │  │ (DataChannel│  │AES-256-GCM│  │
│  └────┬─────┘  └─────┬──────┘  └──────┬──────┘  └───────────┘  │
└───────┼──────────────┼────────────────┼─────────────────────────┘
        │ WebSocket    │ ICE/SDP        │ Encrypted chunks (P2P)
        ▼              ▼                ▼
┌───────────────┐             ┌─────────────────────────────────────┐
│ Signaling Srv │             │             Browser  B              │
│  (Python WS)  │             │  (same stack, receiving side)       │
│  matchmaker   │             └─────────────────────────────────────┘
│  only — no    │
│  file data    │
└───────────────┘

Data path:   File ──► Encrypt (AES-256-GCM) ──► Chunk ──► WebRTC P2P ──► Decrypt ──► File
Server path: Register ──► Exchange SDP/ICE ──► (server done, P2P begins)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend framework** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + inline design tokens |
| **Fonts** | Space Grotesk (UI) · JetBrains Mono (technical values) |
| **P2P transport** | WebRTC DataChannel |
| **Signaling** | Python `websockets` (async WebSocket server) |
| **Encryption** | Web Crypto API — ECDH P-256, HKDF-SHA-256, AES-256-GCM |
| **QR code** | `qrcode.react` |
| **Toasts** | `sonner` |
| **Theme** | `next-themes` |
| **State management** | `useSecureDrop` custom hook (no external store) |
| **Frontend hosting** | Netlify (free tier) |
| **Signaling hosting** | Railway (free tier) / ngrok / LAN |
| **NAT traversal** | Google STUN + Open Relay TURN (free) |

---

## 🚀 Quick Start

### Option A — Same Wi-Fi (LAN, zero config)

```bash
# 1. Install Python deps (once)
pip3 install websockets zeroconf

# 2. Start everything
./start-lan.sh

# 3. Open on other devices
# → http://192.168.X.X:8080  (printed by the script)
# → Or scan the QR code inside the app
```

### Option B — Internet (any device, anywhere)

```bash
# 1. Deploy signaling server to Railway
#    railway.app → New Project → GitHub → set Root Dir = server
#    Copy your Railway URL, e.g. wss://secure-drop-xyz.railway.app

# 2. Set env var in Netlify dashboard
VITE_SIGNALING_URL=wss://secure-drop-xyz.railway.app

# 3. Deploy frontend to Netlify
#    netlify.com → New site → GitHub → build: npm run build, publish: dist

# 4. Open your Netlify URL on any device worldwide
```

### Development

```bash
npm install
npm run dev          # frontend at http://localhost:8080
python server/main.py  # signaling at ws://localhost:8765
```

---

## 📸 Screenshots

### Main Interface — Dark Mode
<!-- ADD SCREENSHOT: docs/screenshots/01-main-dark.png -->
> *Take screenshot: open http://localhost:8080 → ⌘+Shift+4*

![Main dark mode UI](docs/screenshots/01-main-dark.png)

---

### File Selected + Peer Chosen → Send Button
<!-- ADD SCREENSHOT: docs/screenshots/02-file-selected.png -->
> *Drag a file into the drop zone and click a peer card to activate the Send button*

![File selected with peer](docs/screenshots/02-file-selected.png)

---

### Active Transfer with Progress
<!-- ADD SCREENSHOT: docs/screenshots/03-transfer-active.png -->
> *Transfer in progress showing speed, percentage, and progress bar*

![Active transfer](docs/screenshots/03-transfer-active.png)

---

### Incoming Transfer Request Modal
<!-- ADD SCREENSHOT: docs/screenshots/04-incoming-request.png -->
> *The receiving device sees a modal with file info, sender fingerprint, and Accept/Reject buttons*

![Incoming request](docs/screenshots/04-incoming-request.png)

---

### QR Code Panel
<!-- ADD SCREENSHOT: docs/screenshots/05-qr-code.png -->
> *Click the QR button in the header to generate a join URL — scan it on another device*

![QR connect panel](docs/screenshots/05-qr-code.png)

---

### Light Mode
<!-- ADD SCREENSHOT: docs/screenshots/06-light-mode.png -->
> *Toggle with the ☀️ button in the header*

![Light mode](docs/screenshots/06-light-mode.png)

---

## 🔐 Security Model

| Property | Implementation |
|---|---|
| Key exchange | ECDH P-256 — ephemeral per session |
| Key derivation | HKDF-SHA-256 (salt + "secure-drop-v1" info) |
| Encryption | AES-256-GCM — per-chunk, unique 96-bit IV each chunk |
| Integrity | SHA-256 hash of full file, verified on receipt |
| MITM detection | 8-char hex fingerprint derived from raw ECDH shared secret — read aloud to verify |
| Server trust | Signaling server sees only peer IDs + encrypted SDP; never sees keys or file data |
| Forward secrecy | Ephemeral ECDH keys — compromise of one session reveals nothing about others |

---

## 📁 Project Structure

```
secure-drop/
├── src/
│   ├── engine/
│   │   ├── SignalingClient.ts    # WebSocket connection + reconnect backoff
│   │   ├── PeerConnection.ts    # WebRTC offer/answer + ICE negotiation
│   │   ├── ChunkTransfer.ts     # File chunking, backpressure, reassembly
│   │   ├── CryptoService.ts     # ECDH + HKDF + AES-256-GCM + SHA-256
│   │   └── IntegrityVerifier.ts # SHA-256 file hash verification
│   ├── hooks/
│   │   ├── useSecureDrop.ts     # Central app state + logic orchestrator
│   │   ├── useSystemMonitor.ts  # CPU / memory / network metrics
│   │   └── useTheme.ts          # Dark/light mode
│   ├── pages/
│   │   └── LandingPage.tsx      # Full UI — all components inline
│   └── lib/
│       └── constants.ts         # ICE servers, chunk sizes, crypto params
├── server/
│   ├── main.py                  # LAN server (WebSocket + mDNS discovery)
│   ├── cloud_main.py            # Cloud server (Railway/Fly.io)
│   ├── signaling.py             # Peer registry + message relay
│   └── discovery.py             # mDNS advertisement (zeroconf)
├── start-lan.sh                 # One-command LAN launcher
├── netlify.toml                 # Netlify deploy config
└── server/railway.toml          # Railway deploy config
```

---

## 📄 License

MIT — free to use, modify, and distribute.

