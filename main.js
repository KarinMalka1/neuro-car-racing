/**
 * NEON GETAWAY — Police Chase Survival Game Engine (4-Stage Progressive Edition)
 * Featuring:
 * - 4 UNIQUE PROGRESSIVE STAGES (Downtown, Docks, Neon Alleyways, Maximum Overdrive!)
 * - Stage Selector Pills (Click Stage 1, 2, 3, or 4 anytime!)
 * - Next Stage Progression on Victory
 * - Capped Police Swarm (Max 1-2 cops per stage)
 * - 100% Solid Boundary & Building Physics
 */

const carCanvas = document.getElementById('carCanvas');
const carCtx = carCanvas.getContext('2d');

// Stage Definitions & Configurations
const STAGE_CONFIGS = {
    1: { 
        name: "STAGE 1: DOWNTOWN CYBER GRID", 
        escapeSec: 30, 
        playerSpawn: { x: 530, y: 615 },
        cops: [{ x: 100, y: 100, swat: false }],
        desc: "Target: Survive 30s | Cops: 1 Patrol Unit | Layout: 4 Corner Blocks + Central Plaza"
    },
    2: { 
        name: "STAGE 2: INDUSTRIAL DOCKS", 
        escapeSec: 34, 
        playerSpawn: { x: 430, y: 615 },
        cops: [{ x: 100, y: 100, swat: false }, { x: 940, y: 580, swat: true }],
        desc: "Target: Survive 34s | Cops: 2 Units (incl. SWAT Armored Van) | Layout: Warehouses & Shipping Docks"
    },
    3: { 
        name: "STAGE 3: NEON ALLEYWAYS", 
        escapeSec: 36, 
        playerSpawn: { x: 530, y: 615 },
        cops: [{ x: 100, y: 100, swat: false }, { x: 940, y: 100, swat: false }],
        desc: "Target: Survive 36s | Cops: 2 Fast Interceptors | Layout: Narrow Alleyways & Center Isle"
    },
    4: { 
        name: "STAGE 4: MAXIMUM OVERDRIVE", 
        escapeSec: 40, 
        playerSpawn: { x: 530, y: 620 },
        cops: [{ x: 100, y: 100, swat: false }, { x: 940, y: 580, swat: true }],
        desc: "Target: Survive 40s | Cops: High-Speed Heat (SWAT + Interceptor) | Layout: Dual Roundabouts & Core"
    }
};

let currentStage = 1;
let maxUnlockedStage = parseInt(localStorage.getItem('pursuit_max_stage') || '1', 10);
let city = new CityArena(1060, 700, currentStage);
let player = null;
let cops = [];
let collectibles = [];
let particles = [];
let confetti = [];
let skidMarks = [];
let shockwaves = [];
let floatingTexts = [];

let gameState = 'COUNTDOWN'; // 'COUNTDOWN', 'PLAYING', 'VICTORY', 'GAME_OVER'
let countdownTimer = 120; // 2 seconds
let TOTAL_ESCAPE_FRAMES = 30 * 60;
let escapeFrames = TOTAL_ESCAPE_FRAMES;
let cashScore = 0;
let wantedLevel = 1;
let bestSurvivalSeconds = localStorage.getItem('neon_getaway_best') || 0;

let screenShake = 0;
let soundEnabled = true;
const keys = { forward: false, reverse: false, left: false, right: false, boost: false };

// Web Audio API
let audioCtx = null;
let sirenOsc = null;
let sirenGain = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'explosion') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'emp') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'victory') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, now + idx * 0.1);
                g.gain.setValueAtTime(0.15, now + idx * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
                o.start(now + idx * 0.1);
                o.stop(now + idx * 0.1 + 0.45);
            });
        } else if (type === 'busted') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(160, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    } catch (e) {
        // Fallback
    }
}

function updateSirenAudio() {
    if (!soundEnabled || !audioCtx || gameState !== 'PLAYING' || cops.length === 0) {
        if (sirenGain) sirenGain.gain.value = 0;
        return;
    }

    if (!sirenOsc) {
        sirenOsc = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();
        sirenOsc.type = 'sine';
        sirenGain.gain.value = 0.03;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOsc.start();
    }

    const time = audioCtx.currentTime;
    const freq = 620 + Math.sin(time * 3) * 180;
    sirenOsc.frequency.setValueAtTime(freq, time);
    sirenGain.gain.setValueAtTime(0.03, time);
}

function updateStagePills() {
    document.querySelectorAll('.stage-pill').forEach(btn => {
        const stage = parseInt(btn.dataset.stage, 10);
        const isUnlocked = stage <= maxUnlockedStage;
        btn.classList.toggle('locked', !isUnlocked);
        btn.classList.toggle('active', stage === currentStage);
        const lockSpan = btn.querySelector('.lock-status');
        if (lockSpan) {
            lockSpan.textContent = isUnlocked ? '' : '🔒';
        }
    });
}

// Stage Loader: Switches between Stage 1, 2, 3, 4 seamlessly!
function loadStage(stageNum) {
    if (stageNum > maxUnlockedStage) {
        showFloatingText(`🔒 STAGE ${stageNum} IS LOCKED! Clear Stage ${stageNum - 1} first!`, city ? city.width / 2 : 530, city ? city.height / 2 : 350, '#ff0055');
        return;
    }

    currentStage = Math.max(1, Math.min(4, stageNum));
    const cfg = STAGE_CONFIGS[currentStage];

    city = new CityArena(1060, 700, currentStage);
    const spawnX = cfg.playerSpawn ? cfg.playerSpawn.x : city.width / 2;
    const spawnY = cfg.playerSpawn ? cfg.playerSpawn.y : city.height - 120;
    player = new PlayerCar(spawnX, spawnY, 0);

    cops = [];
    collectibles = [];
    particles = [];
    confetti = [];
    skidMarks = [];
    shockwaves = [];
    floatingTexts = [];

    gameState = 'COUNTDOWN';
    countdownTimer = 120;
    TOTAL_ESCAPE_FRAMES = cfg.escapeSec * 60;
    escapeFrames = TOTAL_ESCAPE_FRAMES;
    wantedLevel = currentStage;
    screenShake = 0;

    // Spawn Stage Specific Police Fleet
    cfg.cops.forEach(c => spawnCop(c.x, c.y, c.swat));

    // Spawn Collectibles
    spawnCollectible('CASH');
    spawnCollectible('WRENCH');
    spawnCollectible('EMP');

    // Update UI Stage Pills
    updateStagePills();

    const stageTitleEl = document.getElementById('stageDisplay');
    if (stageTitleEl) stageTitleEl.textContent = cfg.name;

    const stageBadgeEl = document.getElementById('currentStageBadge');
    if (stageBadgeEl) stageBadgeEl.textContent = `STAGE ${currentStage}`;

    const stageDescEl = document.getElementById('stageInfoDesc');
    if (stageDescEl && cfg.desc) stageDescEl.textContent = cfg.desc;

    const missionTargetText = document.getElementById('missionTargetText');
    if (missionTargetText) missionTargetText.textContent = `MISSION: Survive ${cfg.escapeSec}s in ${cfg.name} to WIN!`;

    document.getElementById('endGameModal').classList.add('hidden');
    updateHUD();
}

function resetGame() {
    loadStage(currentStage);
}

function spawnCop(x, y, isSwat = false) {
    if (cops.length >= 2) return; // Cap at 2 cops max for balanced gameplay
    cops.push(new CopCar(x, y, isSwat));
}

function spawnCollectible(type = null) {
    const types = ['CASH', 'CASH', 'WRENCH', 'EMP'];
    const chosenType = type || types[Math.floor(Math.random() * types.length)];
    let x, y, valid = false;
    for (let attempts = 0; attempts < 30; attempts++) {
        x = 80 + Math.random() * (city.width - 160);
        y = 80 + Math.random() * (city.height - 160);
        let inBuilding = false;
        for (const b of city.buildings) {
            if (x > b.x - 20 && x < b.x + b.w + 20 && y > b.y - 20 && y < b.y + b.h + 20) inBuilding = true;
        }
        for (const r of city.roundabouts) {
            if (Math.hypot(x - r.x, y - r.y) < r.radius + 30) inBuilding = true;
        }
        if (!inBuilding) { valid = true; break; }
    }
    if (valid) collectibles.push(new Collectible(x, y, chosenType));
}

// EMP Blast
function triggerEMP() {
    if (!player || player.empCharges <= 0 || gameState !== 'PLAYING') return;
    player.empCharges--;
    playSound('emp');
    screenShake = 16;

    shockwaves.push({ x: player.x, y: player.y, radius: 10, maxRadius: 280, life: 30 });

    for (const cop of cops) {
        const dist = Math.hypot(cop.x - player.x, cop.y - player.y);
        if (dist < 280) {
            cop.hp -= 35;
            const blastAngle = Math.atan2(cop.y - player.y, cop.x - player.x);
            cop.x += Math.cos(blastAngle) * 60;
            cop.y += Math.sin(blastAngle) * 60;
            cop.speed = -3.5;
            if (cop.hp <= 0) triggerExplosion(cop.x, cop.y, true);
        }
    }
    updateHUD();
}

function triggerExplosion(x, y, addCash = true) {
    playSound('explosion');
    screenShake = 12;

    if (addCash) {
        cashScore += 1000;
        escapeFrames = Math.max(0, escapeFrames - 240); // -4s escape time bonus!
        showFloatingText('+$1,000 WRECKED! (-4s ESCAPE)', x, y, '#39ff14');
    }

    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: ['#ff0055', '#ff5500', '#ffe600', '#ffffff'][Math.floor(Math.random() * 4)],
            size: Math.random() * 5 + 3,
            life: 35
        });
    }
}

function showFloatingText(text, x, y, color = '#ffffff') {
    floatingTexts.push({ text, x, y, color, life: 55, vy: -1.1 });
}

// VICTORY: STAGE CLEARED
function triggerVictory() {
    // Strictly forbid winning if car integrity is depleted!
    if (!player || player.hp <= 0) {
        gameOver();
        return;
    }

    gameState = 'VICTORY';
    playSound('victory');

    // UNLOCK NEXT STAGE ONLY ON GENUINE VICTORY!
    if (currentStage < 4) {
        maxUnlockedStage = Math.max(maxUnlockedStage, currentStage + 1);
        localStorage.setItem('pursuit_max_stage', maxUnlockedStage);
    }
    updateStagePills();

    for (let i = 0; i < 160; i++) {
        confetti.push({
            x: carCanvas.width / 2 + (Math.random() - 0.5) * 450,
            y: 80 + Math.random() * 200,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 5 + 2,
            color: ['#00f3ff', '#39ff14', '#ffe600', '#ff007f', '#ff5500'][Math.floor(Math.random() * 5)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 8
        });
    }

    const isFinalStage = (currentStage === 4);
    document.getElementById('modalIcon').textContent = isFinalStage ? '👑' : '🏆';
    document.getElementById('modalTitle').textContent = isFinalStage ? 'GRAND CHAMPION! ALL 4 STAGES BEATEN!' : `STAGE ${currentStage} CLEARED!`;
    document.getElementById('modalTitle').style.color = '#39ff14';
    document.getElementById('modalSubtitle').textContent = isFinalStage ? 'You outsmarted the entire police department across all 4 city sectors!' : `District secured! Get ready for Stage ${currentStage + 1}!`;
    document.getElementById('modalStatTimeLabel').textContent = 'Escape Time';
    document.getElementById('modalStatTime').textContent = `${((TOTAL_ESCAPE_FRAMES - escapeFrames) / 60).toFixed(1)}s`;
    document.getElementById('modalCash').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('modalStatusLabel').textContent = 'Mission';
    document.getElementById('modalStatus').textContent = isFinalStage ? 'ALL CLEARED 👑' : `STAGE ${currentStage} ✅`;

    const nextValEl = document.getElementById('modalNextStageVal');
    if (nextValEl) {
        nextValEl.textContent = isFinalStage ? 'REPLAY ALL 👑' : `STAGE ${currentStage + 1} 🚀`;
    }

    // Configure Next Stage Button: SHOW ON VICTORY
    const nextBtn = document.getElementById('nextStageBtn');
    if (nextBtn) {
        nextBtn.style.display = 'block';
        if (isFinalStage) {
            nextBtn.textContent = '👑 REPLAY FROM STAGE 1 (שחק משלב 1) ➔';
            nextBtn.onclick = () => loadStage(1);
        } else {
            nextBtn.textContent = `🚀 NEXT STAGE: STAGE ${currentStage + 1} (עבור לשלב ${currentStage + 1}) ➔`;
            nextBtn.onclick = () => loadStage(currentStage + 1);
        }
    }

    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.className = 'btn btn-secondary';
        playAgainBtn.textContent = `🔄 Replay Stage ${currentStage}`;
        playAgainBtn.onclick = () => loadStage(currentStage);
    }

    document.getElementById('endGameModal').classList.remove('hidden');
}

// BUSTED (FAILURE)
function gameOver() {
    gameState = 'GAME_OVER';
    playSound('busted');
    triggerExplosion(player.x, player.y, false);

    document.getElementById('modalIcon').textContent = '🚨';
    document.getElementById('modalTitle').textContent = 'BUSTED! MISSION FAILED';
    document.getElementById('modalTitle').style.color = '#ff0055';
    document.getElementById('modalSubtitle').textContent = `Car Integrity depleted in Stage ${currentStage}! You failed the mission.`;
    document.getElementById('modalStatTimeLabel').textContent = 'Survived';
    document.getElementById('modalStatTime').textContent = `${((TOTAL_ESCAPE_FRAMES - escapeFrames) / 60).toFixed(1)}s`;
    document.getElementById('modalCash').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('modalStatusLabel').textContent = 'Status';
    document.getElementById('modalStatus').textContent = 'FAILED ❌';

    const nextValEl = document.getElementById('modalNextStageVal');
    if (nextValEl) nextValEl.textContent = `LOCKED 🔒 (Failed)`;

    // STRICT: HIDE NEXT STAGE BUTTON! Player cannot advance on failure!
    const nextBtn = document.getElementById('nextStageBtn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
        nextBtn.onclick = null;
    }

    // Only Retry Stage is available
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.className = 'btn btn-big btn-danger';
        playAgainBtn.textContent = `🔄 RETRY STAGE ${currentStage} (נסה שוב את השלב)`;
        playAgainBtn.onclick = () => loadStage(currentStage);
    }

    document.getElementById('endGameModal').classList.remove('hidden');
}

// Main Physics Loop
function updatePhysics() {
    updateSirenAudio();

    if (gameState === 'COUNTDOWN') {
        countdownTimer--;
        if (countdownTimer === 80 || countdownTimer === 40) playSound('crash');
        if (countdownTimer <= 0) {
            gameState = 'PLAYING';
            playSound('coin');
        }
        return;
    }

    if (gameState !== 'PLAYING') return;

    // 1. CRITICAL INTEGRITY CHECK FIRST: If car integrity is depleted, fail immediately!
    if (player && player.hp <= 0) {
        gameOver();
        return;
    }

    // 2. Countdown Timer: Only permits victory if car is STILL ALIVE!
    escapeFrames--;
    if (escapeFrames <= 0) {
        if (player && player.hp > 0) {
            triggerVictory();
        } else {
            gameOver();
        }
        return;
    }

    // Spawn Collectibles
    if (collectibles.length < 4 && Math.random() < 0.015) {
        spawnCollectible();
    }

    // Update Player Car
    player.controls.forward = keys.forward ? 1 : 0;
    player.controls.reverse = keys.reverse ? 1 : 0;
    player.controls.left = keys.left ? 1 : 0;
    player.controls.right = keys.right ? 1 : 0;
    player.controls.boost = keys.boost ? 1 : 0;
    player.update(city);

    if (player.isSkidding) {
        skidMarks.push({ x: player.x, y: player.y, alpha: 0.55 });
        if (skidMarks.length > 200) skidMarks.shift();
    }

    // Update Cops
    for (let i = cops.length - 1; i >= 0; i--) {
        const cop = cops[i];
        cop.update(player, city, cops);

        // Player vs Cop collision (Gradual & smooth damage resolution)
        const dist = Math.hypot(player.x - cop.x, player.y - cop.y);
        const touchDist = player.radius + cop.radius;
        if (dist < touchDist) {
            if (player.damageCooldown <= 0) {
                playSound('crash');
                screenShake = 6;
                // Drops slowly: only 5% on cop bump with 35-frame (~0.6s) invulnerability window
                player.hp = Math.max(0, player.hp - 5);
                player.damageCooldown = 35;
                player.hitFlash = 10;
                cop.hp -= 25;
                showFloatingText('-5% INTEGRITY', player.x, player.y - 20, '#ff5500');

                // Bounce away from cop
                const angle = Math.atan2(player.y - cop.y, player.x - cop.x);
                player.x += Math.cos(angle) * 10;
                player.y += Math.sin(angle) * 10;
                player.speed = -0.6;
                cop.speed = -1.2;

                if (cop.hp <= 0) {
                    triggerExplosion(cop.x, cop.y, true);
                    cops.splice(i, 1);
                    continue;
                }
            }
        }

        if (cop.isDead) {
            triggerExplosion(cop.x, cop.y, true);
            cops.splice(i, 1);
        }
    }

    // Collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const item = collectibles[i];
        if (Math.hypot(player.x - item.x, player.y - item.y) < player.width + item.radius) {
            playSound('coin');
            if (item.type === 'CASH') {
                cashScore += 500;
                escapeFrames = Math.max(0, escapeFrames - 180); // -3s
                showFloatingText('+$500 (-3s ESCAPE)', item.x, item.y, '#ffe600');
            } else if (item.type === 'WRENCH') {
                player.hp = Math.min(player.maxHp, player.hp + 45);
                showFloatingText('+45% INTEGRITY', item.x, item.y, '#39ff14');
            } else if (item.type === 'EMP') {
                player.empCharges = Math.min(3, player.empCharges + 1);
                showFloatingText('+1 EMP ⚡', item.x, item.y, '#00f3ff');
            }
            collectibles.splice(i, 1);
        }
    }

    // Particles & Shockwaves
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.radius += (s.maxRadius - s.radius) * 0.18;
        s.life--;
        if (s.life <= 0) shockwaves.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const f = floatingTexts[i];
        f.y += f.vy; f.life--;
        if (f.life <= 0) floatingTexts.splice(i, 1);
    }

    if (player && player.hp <= 0) {
        gameOver();
        return;
    }

    updateHUD();
}

function updateHUD() {
    if (!player) return;

    // Health Bar
    const hpPercent = Math.max(0, Math.round((player.hp / player.maxHp) * 100));
    const hpBar = document.getElementById('hpFill');
    if (hpBar) {
        hpBar.style.width = `${hpPercent}%`;
        hpBar.style.background = hpPercent > 35 ? 'linear-gradient(90deg, #39ff14, #00f3ff)' : 'linear-gradient(90deg, #ff0055, #ff5500)';
    }
    document.getElementById('hpVal').textContent = `${hpPercent}%`;

    // Escape Countdown Timer
    const escapeSec = Math.max(0, (escapeFrames / 60)).toFixed(1);
    document.getElementById('escapeTimerVal').textContent = `${escapeSec}s`;

    // Speedometer & Stats
    document.getElementById('speedKmhVal').textContent = Math.round(Math.abs(player.speed) * 32);
    document.getElementById('cashScoreVal').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('copsCountVal').textContent = `${cops.length} Active`;

    // EMP Status
    const empBtn = document.getElementById('empIndicator');
    if (empBtn) {
        empBtn.textContent = `⚡ EMP: ${player.empCharges} READY (Press Space)`;
        empBtn.style.borderColor = player.empCharges > 0 ? '#00f3ff' : '#415270';
        empBtn.style.color = player.empCharges > 0 ? '#00f3ff' : '#64748b';
    }
}

// Render
function render() {
    carCtx.save();

    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        carCtx.translate(dx, dy);
        screenShake *= 0.88;
        if (screenShake < 0.5) screenShake = 0;
    }

    city.draw(carCtx);

    for (let i = 0; i < skidMarks.length; i++) {
        const s = skidMarks[i];
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        carCtx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
        carCtx.fill();
    }

    for (const item of collectibles) item.draw(carCtx);
    for (const cop of cops) cop.draw(carCtx);
    if (player && gameState !== 'GAME_OVER') player.draw(carCtx);

    for (const s of shockwaves) {
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        carCtx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
        carCtx.shadowColor = '#00f3ff';
        carCtx.shadowBlur = 25;
        carCtx.lineWidth = 4;
        carCtx.stroke();
    }

    for (const p of particles) {
        carCtx.beginPath();
        carCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        carCtx.fillStyle = p.color;
        carCtx.fill();
    }

    for (const f of floatingTexts) {
        carCtx.save();
        carCtx.fillStyle = f.color;
        carCtx.shadowColor = f.color;
        carCtx.shadowBlur = 10;
        carCtx.font = 'bold 15px "Segoe UI", sans-serif';
        carCtx.textAlign = 'center';
        carCtx.fillText(f.text, f.x, f.y);
        carCtx.restore();
    }

    // Victory Confetti
    if (gameState === 'VICTORY') {
        for (let i = 0; i < confetti.length; i++) {
            const c = confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.rotSpeed;
            if (c.y > carCanvas.height) c.y = -10;

            carCtx.save();
            carCtx.translate(c.x, c.y);
            carCtx.rotate((c.rotation * Math.PI) / 180);
            carCtx.fillStyle = c.color;
            carCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
            carCtx.restore();
        }
    }

    // Countdown Banner
    if (gameState === 'COUNTDOWN') {
        carCtx.fillStyle = 'rgba(7, 10, 18, 0.75)';
        carCtx.fillRect(0, 0, city.width, city.height);

        carCtx.fillStyle = city.theme.borderGlow;
        carCtx.shadowColor = city.theme.borderGlow;
        carCtx.shadowBlur = 30;
        carCtx.font = 'bold 64px "Segoe UI", sans-serif';
        carCtx.textAlign = 'center';
        carCtx.textBaseline = 'middle';
        carCtx.fillText(STAGE_CONFIGS[currentStage].name, city.width / 2, city.height / 2 - 25);

        carCtx.fillStyle = '#ffffff';
        carCtx.shadowBlur = 12;
        carCtx.font = 'bold 22px "Segoe UI", sans-serif';
        carCtx.fillText(`SURVIVE ${STAGE_CONFIGS[currentStage].escapeSec} SECONDS TO ESCAPE!`, city.width / 2, city.height / 2 + 55);
    }

    carCtx.restore();
}

function animate() {
    updatePhysics();
    render();
    requestAnimationFrame(animate);
}

// UI Event Handlers
document.getElementById('restartBtn').addEventListener('click', resetGame);
const initialPlayAgain = document.getElementById('playAgainBtn');
if (initialPlayAgain) initialPlayAgain.onclick = resetGame;

// Stage Selector Buttons
document.querySelectorAll('.stage-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        const stageNum = parseInt(btn.dataset.stage, 10);
        loadStage(stageNum);
    });
});

const audioBtn = document.getElementById('audioBtn');
audioBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    audioBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    audioBtn.classList.toggle('active', soundEnabled);
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'ArrowUp' || e.code === 'KeyW') { keys.forward = true; e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.code === 'KeyS') { keys.reverse = true; e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'Shift') { keys.boost = true; }
    else if (e.code === 'Space') {
        e.preventDefault();
        triggerEMP();
    } else if (e.key === 'r' || e.key === 'R') {
        resetGame();
    } else if (e.key === '1') { loadStage(1); }
    else if (e.key === '2') { loadStage(2); }
    else if (e.key === '3') { loadStage(3); }
    else if (e.key === '4') { loadStage(4); }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.code === 'KeyW') keys.forward = false;
    else if (e.key === 'ArrowDown' || e.code === 'KeyS') keys.reverse = false;
    else if (e.key === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    else if (e.key === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    else if (e.key === 'Shift') keys.boost = false;
});

// Launch on page load
window.addEventListener('DOMContentLoaded', () => {
    loadStage(1);
    requestAnimationFrame(animate);
});
