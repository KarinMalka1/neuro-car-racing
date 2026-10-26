# 🚨 Neon Getaway — Police Chase Survival

A high-octane, real-time arcade police pursuit survival game built from scratch with **vanilla HTML5 Canvas, CSS3, and JavaScript**. Runs 100% in the browser with **zero dependencies, no backend, and no external libraries**.

🌐 **Play Live Demo on GitHub Pages:**  
👉 **[https://karinmalka1.github.io/neuro-car-racing/](https://karinmalka1.github.io/neuro-car-racing/)**

---

## 🌟 Game Overview & Features

You are a neon getaway driver in a cyberpunk metropolis. AI police pursuit units are hunting you down. Your mission: **survive as long as you can, lure police into building walls to destroy them, collect cash, and trigger EMP shockwaves!**

### 🎮 Core Mechanics & Architecture
1. **Dynamic Pursuit AI (`car.js`)**:
   - Police cruisers calculate intercept trajectories toward your car.
   - 3-feeler raycasting obstacle avoidance lets police navigate city intersections and avenues.
   - Trick police cruisers by making sharp drifts around building corners so they slam into walls and explode!

2. **Wanted Level System (⭐ to ⭐⭐⭐⭐⭐)**:
   - **1 Star (0–15s):** 2 standard patrol cruisers.
   - **2 Stars (15–30s):** 4 cruisers with faster response times.
   - **3 Stars (30–45s):** 6 cruisers + heavy SWAT armored trucks!
   - **4 Stars (45–60s):** 8 units with intense pursuit.
   - **5 Stars (60s+):** Maximum Chaos! Swarms of cruisers and SWAT vehicles.

3. **Power-Ups & Tactical Weapons**:
   - 💰 **Cash Bags ($500):** Boost your score.
   - 🔧 **Repair Wrenches (+35% HP):** Fix collision damage.
   - ⚡ **EMP Shockwave Blast:** Press <kbd>Space</kbd> to discharge an electric shockwave that blasts surrounding police cruisers away and deals heavy damage!
   - 🚀 **Nitro Jet Boost:** Hold <kbd>Shift</kbd> to blast forward with cyan jet flames and leave the police in your dust.

4. **Procedural Neon City Arena (`city.js`)**:
   - 4 major building blocks creating avenues, 4-way intersections, and alleyways.
   - Central roundabout plaza for 360-degree drifting escapes.
   - Screen shake and explosion debris on heavy impacts.

5. **Procedural Web Audio API Synth (`main.js`)**:
   - Authentic oscillating police siren wails.
   - Crash thuds, explosion booms, EMP zaps, and cash pickup chimes generated purely via mathematical wave oscillators (zero audio files needed).

---

## 🕹️ Controls & Hotkeys

| Key / Control | Action |
|---|---|
| <kbd>W</kbd> or <kbd>↑</kbd> | Accelerate (Gas) |
| <kbd>S</kbd> or <kbd>↓</kbd> | Brake / Reverse |
| <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Steer & Drift |
| Hold <kbd>Shift</kbd> | 🚀 Nitro Jet Boost |
| <kbd>Space</kbd> | ⚡ Trigger EMP Shockwave Blast |
| <kbd>R</kbd> or **כפתור שחק שוב** | 🔄 Restart Game immediately |

---

## 🚀 How to Run Locally

1. Clone or download the repository:
   ```bash
   git clone https://github.com/KarinMalka1/neuro-car-racing.git
   ```
2. Double-click `index.html` to open directly in any browser (Chrome, Edge, Firefox, Safari).  
   *No servers, no node_modules, and no installation required!*

---

## 👥 Authors
* Developed for **Agentic Programming (AICODE 67723)**
* School of Computer Science & Engineering, **Hebrew University of Jerusalem**
