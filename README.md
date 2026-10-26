# 🏎️ Neuroevolution 2D Car Racing Simulation

A high-performance, real-time autonomous car racing simulation using genetic algorithms and feed-forward neural networks. Built from scratch with vanilla HTML5, CSS3, and JavaScript — running entirely in the browser with **zero dependencies, no backend, and no external libraries**.

Hosted on GitHub Pages.

---

## 🌟 Features & Architecture

1. **Procedural Closed-Loop Racetrack (`track.js`)**:
   - Catmull-Rom smoothed circuit with realistic straights, sweeping curves, chicanes, and a technical hairpin.
   - Perpendicular checkpoint gates accurately measure distance and lap completion.
   - Dual neon boundary barriers with polygon-to-segment collision detection.

2. **Kinematic Car Physics (`car.js`)**:
   - 2D top-down car kinematics (acceleration, friction, drifting, steering, reverse).
   - 4-point bounding box polygon collision testing against track walls.
   - Stuck/timeout detection to automatically cull inactive cars and accelerate evolution.

3. **Ray-Casting Sensors (`sensor.js`)**:
   - 5 directional ray-casters extending from the front bumper.
   - High-speed line-line intersection math measuring normalized distance to walls.
   - Visualized in real time with laser beams and collision spark indicators for the lead car.

4. **Custom Neural Network Brain (`network.js`)**:
   - Built from scratch: 5 Input nodes (sensor rays) → 6 Hidden nodes → 4 Output nodes (Accelerate, Reverse, Steer Left, Steer Right).
   - Hyperbolic tangent (tanh) activation with discrete actuation thresholds.
   - Genetic mutation engine with configurable mutation rate and elitism (the champion brain survives intact).

5. **Live Brain Visualizer (`visualizer.js`)**:
   - Real-time animated neural network HUD showing synaptic weights (cyan positive, magenta negative) and active firing neurons.

6. **Cyberpunk Dashboard & Audio FX (`main.js` & `style.css`)**:
   - Live telemetry: Generation counter, cars alive, maximum fitness record.
   - Simulation speed toggles: **1x, 2x, 4x, 10x** (train 10 generations in seconds!).
   - Web Audio API procedural sound effects for checkpoints and evolutionary breakthroughs.
   - LocalStorage persistence to save and load champion brains across sessions.

---

## 🎮 Controls & Hotkeys

| Key / Control | Action |
|---|---|
| <kbd>Space</kbd> | Pause / Resume simulation |
| <kbd>N</kbd> | Force evolution to next generation |
| <kbd>S</kbd> | Save champion brain to LocalStorage |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>4</kbd> / <kbd>0</kbd> | Set simulation speed to 1x, 2x, 4x, or 10x |
| **Mutation Slider** | Adjust mutation probability (5% - 50%) |
| **Sound Button** | Toggle Web Audio procedural sound effects |
| **Reset Button** | Clear saved brain and start over at Generation 1 |

---

## 🚀 How to Run Locally

Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
No installation, no npm, and no server required!
