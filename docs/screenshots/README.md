# Screenshot Guide

App runs at **http://localhost:8080** — take screenshots with **⌘+Shift+4** on macOS.

| Filename | State to capture |
|---|---|
| `01-main-dark.png` | Main UI, dark mode, no peers (shows 📡 scanner) |
| `02-file-selected.png` | File in drop zone + peer card selected (Send button glowing) |
| `03-transfer-active.png` | Transfer in progress (progress bar + speed visible) |
| `04-incoming-request.png` | Incoming request modal on the receiving device |
| `05-qr-code.png` | QR panel open (click 📱 QR in header) |
| `06-light-mode.png` | Light mode active (click ☀️ toggle) |

After saving screenshots here, the images will automatically appear in:
- `../showcase.html` (replace placeholder divs with `<img>` tags)
- `../../README.md` (already has `![caption](docs/screenshots/filename.png)` links)
