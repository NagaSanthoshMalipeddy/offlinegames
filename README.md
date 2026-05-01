# 🎮 Game Arcade

A fully responsive, zero-dependency browser-based Game Arcade with **15 playable games** — from classic puzzles to 3D simulators — built with vanilla HTML/CSS/JS and Three.js.

**[▶ Play Now](https://gentle-river-02908461e.6.azurestaticapps.net)** *(Update this link after deploying)*

---

## 🕹️ Games

### 🎮 Simulation & Action
| Game | Description |
|------|-------------|
| **Mini Driving** | 3D city driving — dodge traffic, collect coins, manage fuel, complete missions |
| **Flight Simulator** | Fly through rings, manage altitude & fuel, land safely on the runway |
| **Train Simulator** | Drive a train along a figure-8 track, stop at stations, follow signals |
| **Archery** | Aim & shoot arrows at targets with wind physics and moving targets |
| **Target Shooting** | FPS target practice with pointer lock, ammo/reload, and streak scoring |

### 🧩 Logic & Puzzle
| Game | Description |
|------|-------------|
| **Tic Tac Toe** | Classic 3×3 game with Minimax AI — Easy, Medium, Hard difficulty |
| **Memory Cards** | Flip cards to find matching pairs — 3 grid sizes |
| **2048** | Slide and merge tiles — swipe or arrow keys |
| **Minesweeper** | Reveal cells without hitting mines — 3 difficulty levels, first-click safe |
| **Sudoku** | Generated 9×9 puzzles with hints and auto-solver |

### ⚡ Reflex & Casual
| Game | Description |
|------|-------------|
| **Reaction Time** | Click when the screen turns green — 5-round average |
| **Whack-a-Mole** | Whack moles in 30 seconds — speed increases as you score |
| **Click Speed** | Click as fast as possible in 10 seconds — CPS counter |
| **Color Match** | Stroop effect game — pick the color, not the word |

### 🕹️ Classic
| Game | Description |
|------|-------------|
| **Ping Pong** | 1P vs AI or 2P local — adjustable ball speed and AI difficulty |

---

## ✨ Features

- **15 games** across 4 categories on a single-page app
- **Fully responsive** — works on desktop, tablet, and mobile
- **Touch controls** for all games including 3D simulators
- **AI opponents** — Minimax (Tic Tac Toe), configurable difficulty (Ping Pong)
- **3D environments** — procedurally generated cities, terrain, tracks, and skies
- **Physics** — projectile motion (Archery), vehicle dynamics (Driving/Flight/Train)
- **Mission systems** — checkpoints, scoring, fuel/resource management
- **FPS controls** — pointer lock mouse-look (Target Shooting)
- **No build step** — just open `index.html` in a browser
- **Category-grouped home screen** with responsive card grid

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| **HTML5** | Structure & Canvas |
| **CSS3** | Responsive layout, animations, CSS Grid |
| **JavaScript (ES6+)** | Game logic, rendering, state management |
| **Three.js** | 3D rendering for simulation games (loaded via CDN) |
| **Azure Static Web Apps** | Hosting |

**Zero npm dependencies.** No frameworks. No build tools. Pure browser code.

---

## 📁 Project Structure

```
├── index.html              # Single page — home screen + game shell
├── 404.html                # Custom 404 error page
├── css/
│   └── style.css           # Global responsive styles
├── js/
│   ├── script.js           # Router — game registration, navigation, category grouping
│   └── games/
│       ├── ping-pong.js        # Ping Pong (Canvas 2D)
│       ├── tic-tac-toe.js      # Tic Tac Toe (DOM + Minimax AI)
│       ├── memory-game.js      # Memory Cards (DOM)
│       ├── reaction-test.js    # Reaction Time (DOM)
│       ├── game-2048.js        # 2048 (DOM)
│       ├── minesweeper.js      # Minesweeper (DOM)
│       ├── sudoku.js           # Sudoku (DOM + Backtracking)
│       ├── whack-a-mole.js     # Whack-a-Mole (DOM)
│       ├── click-speed.js      # Click Speed (DOM)
│       ├── color-match.js      # Color Match (DOM)
│       ├── driving-game.js     # Mini Driving (Three.js)
│       ├── archery-game.js     # Archery (Three.js)
│       ├── shooting-game.js    # Target Shooting (Three.js)
│       ├── train-sim.js        # Train Simulator (Three.js)
│       └── flight-sim.js       # Flight Simulator (Three.js)
└── staticwebapp.config.json    # Azure Static Web Apps config
```

---

## 🚀 Getting Started

### Run Locally
```bash
# No install needed — just serve the files
# Option 1: VS Code Live Server extension
# Option 2: Python
python -m http.server 8000

# Option 3: Node
npx serve .
```
Open `http://localhost:8000` in your browser.

### Deploy to Azure Static Web Apps
1. Push to GitHub
2. Create an Azure Static Web App resource
3. Connect to this repo — no build configuration needed
4. App location: `/` | Output location: `/`

---

## 🎮 Controls

| Game | Keyboard | Mobile |
|------|----------|--------|
| Ping Pong | W/S (left) ↑/↓ (right) | Touch drag |
| Driving | WASD / Arrows | On-screen buttons |
| Flight | W/S pitch, A/D turn, Q/E roll, Shift throttle | On-screen buttons |
| Train | W throttle, S brake, Space e-brake | On-screen buttons |
| Archery | Click & drag to aim, release to shoot | Touch drag |
| Shooting | Mouse aim (pointer lock), click to shoot, R reload | Tap to shoot |
| 2048 | Arrow keys | Swipe |
| Sudoku | Click cell + number keys 1-9 | Tap cell + number pad |

---

## 📄 License

MIT
