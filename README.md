# 🪟 WinOS

**Windows 11 — Recreated in the Browser**

A faithful recreation of the Windows 11 desktop experience built entirely with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools — just open `index.html` and go.

## ✨ Features

### Desktop & Window Management
- **Desktop Icons** — 18 launchable apps arranged on the desktop
- **Draggable Windows** — click-to-focus, minimize, maximize/restore, close
- **Taskbar** — centered app launcher icons with running-app indicators
- **Start Menu** — overlay with app grid, search, and user controls
- **Right-click Context Menu** — desktop context menu with personalization options
- **Wallpaper Switcher** — changeable wallpapers via Settings or context menu

### Windows 11 File Explorer
- **Ribbon Toolbar** — New, Cut, Copy, Paste, Rename, Share, Sort, View buttons with Win11 icons
- **Navigation Toolbar** — Back, Forward, Up buttons with history tracking, editable address bar, live search
- **Navigation Pane** — collapsible sidebar tree with Quick Access, Desktop, Downloads, Documents, Pictures, Music, Videos, OneDrive, and This PC
- **File Grid** — medium icon view with proper Win11 folder/file icons
- **Virtual File System** — full directory tree (C: drive) with folders, text files, shortcuts, and executables
- **Breadcrumb Navigation** — clickable address bar with forward/back history
- **Keyboard Shortcuts** — Backspace (go up), Alt+Left/Right (back/forward)
- **In-folder Search** — real-time filter as you type
- **Status Bar** — item count and view toggle

### Action Center (Quick Settings)
- **Quick Toggles** — Wi-Fi, Bluetooth, Flight Mode, Battery Saver, Night Light, Location
- **Brightness Slider** — adjusts page brightness via CSS filter
- **Volume Slider** — visual volume control with dynamic audio icon
- **Night Light** — warm-tone filter applied across the entire page
- **Battery Status** — real battery level via the Web Battery API (where supported)
- **Taskbar System Tray** — WiFi, audio, and battery icons that reflect current state

### Calendar Panel
- **Live Clock** — synced time and date display
- **Month Grid** — full calendar with today highlighted

### Built-in Apps
| App | Description |
|-----|-------------|
| 📝 Notepad | Text editor with open/save support for VFS files |
| 🧮 Calculator | Fully functional calculator |
| 📁 Explorer | Windows 11-style file browser (see above) |
| 🌐 Browser | Embedded web browser (iframe) |
| 🖥️ Terminal | Command-line interface with `cd`, `dir`, `cls`, `help` |
| ⚙️ Settings | System info and wallpaper customization |
| 🎨 Paint | Canvas-based drawing app |
| 🎵 Spotify | Embedded Spotify web player |
| ❌⭕ TicTacToe | Classic two-player game |
| ⛏️ Minecraft | Embedded Minecraft Classic |
| ❓ Quiz | Interactive quiz game |
| ⌨️ Typing | Typing speed test |
| 💻 Cheats++ | Built-in cheat utility |
| 🐍 Snake | Classic Snake game |
| 🆚 VS Code | Embedded VS Code for the Web |
| 🎨 skribbl.io | Multiplayer drawing game |
| 🟦 Geometry Dash | Lite version embedded |
| 🐦 Flappy Bird | Embedded Flappy Bird clone |

## 🛠️ Tech Stack

- **HTML5** — semantic layout, SVG icons
- **CSS3** — glassmorphism (`backdrop-filter`), CSS Grid, Flexbox, animations, range input styling
- **Vanilla JavaScript** — zero dependencies, DOM manipulation, drag-and-drop, virtual file system, Battery API integration
- **Assets** — Win11-style icons from [win11React](https://github.com/nicedayinn/win11React) (51 icon assets)

## 📁 Project Structure

```
WinOS/
├── index.html          # Main HTML — desktop, taskbar, panels
├── script.js           # All application logic (2700+ lines)
├── style.css           # All styling (2000+ lines)
└── img/
    ├── icon/
    │   ├── ui/         # 26 UI icons (wifi, bluetooth, audio, etc.)
    │   └── win/        # 25 Windows folder/file icons
    └── wallpapers/     # Desktop wallpaper images
```

## 🚀 Getting Started

No build step required. Clone and open:

```bash
git clone https://github.com/AnupSharma12/WinOS.git
cd WinOS
```

Then either:
- Double-click `index.html` in your file manager
- Or serve locally: `npx http-server .` and open `http://localhost:8080`

## 🤝 Contributing

Contributions are welcome! Feel free to check the [issues page](https://github.com/AnupSharma12/WinOS/issues).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/NewApp`)
3. Commit your changes (`git commit -m 'Add new custom App'`)
4. Push to the branch (`git push origin feature/NewApp`)
5. Open a Pull Request

## 📄 License

This project is open source.

## 📝 License

This project is open-source and free to use.
