# 🚨 Neon Getaway — Police Pursuit Survival (4 Progressive Stages)

A high-octane, real-time arcade police pursuit survival game built from scratch with **vanilla HTML5 Canvas, CSS3, and JavaScript**. Runs 100% in the browser with **zero dependencies, no backend, and no external libraries**.

🌐 **Play Live Demo on GitHub Pages:**  
👉 **[https://karinmalka1.github.io/neon-getaway/](https://karinmalka1.github.io/neon-getaway/)**  
*(Old URL redirect: https://karinmalka1.github.io/neuro-car-racing/)*

---

## 🌟 Game Overview & Features

You are a neon getaway driver in a cyberpunk metropolis. AI police pursuit cruisers are on your tail. Your mission: **survive until the escape timer counts down, trick police into slamming into building walls, collect cash & repairs, and trigger EMP blasts to unlock all 4 stages!**

### 🏙️ 4 Unique Progressive Stages
Switch between stages anytime using the **Stage Selector Buttons** in the header or pressing keys <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, or <kbd>4</kbd>:

1. **Stage 1: Downtown Cyber Grid**
   - *Escape Time:* 30 Seconds
   - *Threat Level:* 1 Police Cruiser
   - *Layout:* 4 corner corporate blocks + central neon plaza
   - *Palette:* Electric Cyan (`#00f3ff`) & Neon Magenta (`#ff007f`)

2. **Stage 2: Industrial Docks**
   - *Escape Time:* 34 Seconds
   - *Threat Level:* 2 Units (Patrol Cruiser + Heavy SWAT Armored Truck)
   - *Layout:* Elongated warehouses & shipping container docks
   - *Palette:* Amber Gold (`#ffe600`) & Emerald Green (`#39ff14`)

3. **Stage 3: Neon Alleyways**
   - *Escape Time:* 36 Seconds
   - *Threat Level:* 2 Fast Agile Interceptors
   - *Layout:* High-density city chicanes & central divider isle
   - *Palette:* Neon Purple (`#a855f7`) & Electric Cyan (`#00f3ff`)

4. **Stage 4: Maximum Overdrive ⚡**
   - *Escape Time:* 40 Seconds
   - *Threat Level:* SWAT Armored Van + High-Speed Interceptor
   - *Layout:* Fortified central core + dual escape plazas
   - *Palette:* Crimson Red (`#ff0055`) & Pure White (`#ffffff`)

---

### 🎮 Core Mechanics & Architecture

1. **100% Solid Boundary & Building Physics (`car.js`)**:
   - Zero-penetration vertex-level collision clamping prevents any car corner from crossing outer arena walls or driving over buildings.
   - Elastic bumper rebound and visual flash on impacts.

2. **Smart Pursuit AI & Wreck Mechanics (`car.js`)**:
   - Police cruisers calculate interception angles toward the player.
   - 3-feeler raycasting allows police to navigate street corners.
   - Trick police cruisers into hitting buildings to blow them up for a **+$1,000 Cash and -4s Escape Bonus**!

3. **Power-Ups & Tactical Weapons**:
   - 💰 **Cash Bags ($500):** Knocks **-3 seconds** off your escape countdown!
   - 🔧 **Repair Wrenches (+45% HP):** Instantly restores vehicle integrity.
   - ⚡ **EMP Shockwave Blast (<kbd>Space</kbd>):** Discharges a 360-degree electromagnetic blast that pushes and damages all nearby police cruisers.
   - 🚀 **Nitro Jet Boost (Hold <kbd>Shift</kbd>):** Blasts forward with cyan jet exhaust to outpace pursuers.

4. **Interactive Stage Progression & Victory (`main.js`)**:
   - Upon surviving a stage, the **Victory Modal** appears with confetti and displays a prominent **"NEXT STAGE"** button to advance directly to the next stage.
   - Beating all 4 stages rewards you with the **Grand Champion Crown 👑**.

5. **Procedural Web Audio API Synth (`main.js`)**:
   - Dynamic siren audio that ramps frequency as cops pursue.
   - Synthesized crash impacts, explosion booms, EMP zaps, and cash pickup chimes generated purely via mathematical wave oscillators (zero external audio files).

---

## 🕹️ Controls & Hotkeys

| Key / Control | Action |
|---|---|
| <kbd>W</kbd> or <kbd>↑</kbd> | Accelerate (Gas) |
| <kbd>S</kbd> or <kbd>↓</kbd> | Brake / Reverse |
| <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Steer & Drift |
| Hold <kbd>Shift</kbd> | 🚀 Nitro Jet Boost |
| <kbd>Space</kbd> | ⚡ Trigger EMP Shockwave Blast |
| <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>4</kbd> | 🏙️ Instant Stage Select (Stage 1 to 4) |
| <kbd>R</kbd> or **כפתור שחק שוב** | 🔄 Restart Stage immediately |

---

## 🚀 How to Run Locally

1. Clone or download the repository:
   ```bash
   git clone https://github.com/KarinMalka1/neon-getaway.git
   ```
2. Double-click `index.html` to open directly in any browser (Chrome, Edge, Firefox, Safari).  
   *No servers, no node_modules, and no installation required!*

---

## 👥 Authors
* Developed for **Agentic Programming (AICODE 67723)**
* School of Computer Science & Engineering, **Hebrew University of Jerusalem**
