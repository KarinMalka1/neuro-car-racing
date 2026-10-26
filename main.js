/**
 * NEON GETAWAY — Police Chase Survival Game Engine (Win-Enabled Edition)
 * Features:
 * - FEW POLICE CARS (Max 1-2 cops total!)
 * - CLEAR WIN CONDITION (Survive 35s or collect cash to escape the city and WIN!)
 * - Victory fanfare, Confetti, and "שחק שוב" Restart Button
 */

const carCanvas = document.getElementById('carCanvas');
const carCtx = carCanvas.getContext('2d');

// Game State
let city = new CityArena(1060, 700);
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
const TOTAL_ESCAPE_FRAMES = 35 * 60; // 35 seconds to WIN
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

// Reset / Start Game
function resetGame() {
    player = new PlayerCar(city.width / 2, city.height / 2 + 120, 0);
    cops = [];
    collectibles = [];
    particles = [];
    confetti = [];
    skidMarks = [];
    shockwaves = [];
    floatingTexts = [];

    gameState = 'COUNTDOWN';
    countdownTimer = 120;
    escapeFrames = TOTAL_ESCAPE_FRAMES;
    cashScore = 0;
    wantedLevel = 1;
    screenShake = 0;

    // FEW POLICE: Start with ONLY 1 police car!
    spawnCop(100, 100, false);

    // Initial collectibles
    spawnCollectible('CASH');
    spawnCollectible('WRENCH');
    spawnCollectible('EMP');

    document.getElementById('endGameModal').classList.add('hidden');
    updateHUD();
}

function spawnCop(x, y, isSwat = false) {
    if (cops.length >= 2) return; // STRICT MAXIMUM 2 COPS TOTAL!
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
        if (Math.hypot(x - city.roundabout.x, y - city.roundabout.y) < city.roundabout.radius + 30) inBuilding = true;
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
        // Destroying a cop speeds up escape by 4 seconds!
        escapeFrames = Math.max(0, escapeFrames - 240);
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

// WIN CONDITION: PLAYER ESCAPES!
function triggerVictory() {
    gameState = 'VICTORY';
    playSound('victory');

    // Massive victory confetti fireworks
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

    document.getElementById('modalIcon').textContent = '🏆';
    document.getElementById('modalTitle').textContent = 'YOU ESCAPED! YOU WON!';
    document.getElementById('modalTitle').style.color = '#39ff14';
    document.getElementById('modalSubtitle').textContent = 'The police lost your signal! You successfully broke free!';
    document.getElementById('modalStatTimeLabel').textContent = 'Escape Time';
    document.getElementById('modalStatTime').textContent = `${((TOTAL_ESCAPE_FRAMES - escapeFrames) / 60).toFixed(1)}s`;
    document.getElementById('modalCash').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('modalStatusLabel').textContent = 'Status';
    document.getElementById('modalStatus').textContent = 'CLEARED ✅';
    document.getElementById('endGameModal').classList.remove('hidden');
}

// BUSTED: PLAYER WRECKED
function gameOver() {
    gameState = 'GAME_OVER';
    playSound('busted');
    triggerExplosion(player.x, player.y, false);

    document.getElementById('modalIcon').textContent = '🚨';
    document.getElementById('modalTitle').textContent = 'BUSTED!';
    document.getElementById('modalTitle').style.color = '#ff0055';
    document.getElementById('modalSubtitle').textContent = 'Your car was damaged by the police pursuit!';
    document.getElementById('modalStatTimeLabel').textContent = 'Survived';
    document.getElementById('modalStatTime').textContent = `${((TOTAL_ESCAPE_FRAMES - escapeFrames) / 60).toFixed(1)}s`;
    document.getElementById('modalCash').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('modalStatusLabel').textContent = 'Status';
    document.getElementById('modalStatus').textContent = 'BUSTED ❌';
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

    // Escape Countdown Timer
    escapeFrames--;
    if (escapeFrames <= 0) {
        triggerVictory();
        return;
    }

    // Police Reinforcements (MAX 2 COPS IN TOTAL!)
    if (cops.length < 2 && escapeFrames < TOTAL_ESCAPE_FRAMES * 0.6) {
        spawnCop(city.width - 100, city.height - 100, false);
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
    player.update(city.borders);

    if (player.isSkidding) {
        skidMarks.push({ x: player.x, y: player.y, alpha: 0.55 });
        if (skidMarks.length > 200) skidMarks.shift();
    }

    // Update Cops
    for (let i = cops.length - 1; i >= 0; i--) {
        const cop = cops[i];
        cop.update(player, city.borders, cops);

        // Player vs Cop bump (Player takes only minimal damage!)
        if (CarUtils.polysIntersect(player.polygon, [cop.polygon[0], cop.polygon[2]])) {
            playSound('crash');
            screenShake = 8;
            player.hp = Math.max(0, player.hp - 6); // Only 6 damage!
            cop.hp -= 20;

            player.speed = -1.2;
            cop.speed = -1.8;

            if (cop.hp <= 0) {
                triggerExplosion(cop.x, cop.y, true);
                cops.splice(i, 1);
                continue;
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
                // Cash knocks 3 seconds off escape time!
                escapeFrames = Math.max(0, escapeFrames - 180);
                showFloatingText('+$500 (-3s ESCAPE)', item.x, item.y, '#ffe600');
            } else if (item.type === 'WRENCH') {
                player.hp = Math.min(player.maxHp, player.hp + 45);
                showFloatingText('+45% HEALTH', item.x, item.y, '#39ff14');
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

    // Check Death
    if (player.hp <= 0) {
        gameOver();
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

    // Speedometer
    document.getElementById('speedKmhVal').textContent = Math.round(Math.abs(player.speed) * 32);
    document.getElementById('cashScoreVal').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('copsCountVal').textContent = `${cops.length} / 2`;

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

        carCtx.fillStyle = '#ff0055';
        carCtx.shadowColor = '#ff0055';
        carCtx.shadowBlur = 30;
        carCtx.font = 'bold 72px "Segoe UI", sans-serif';
        carCtx.textAlign = 'center';
        carCtx.textBaseline = 'middle';
        carCtx.fillText('🚨 ESCAPE MISSION!', city.width / 2, city.height / 2 - 25);

        carCtx.fillStyle = '#39ff14';
        carCtx.shadowBlur = 12;
        carCtx.font = 'bold 22px "Segoe UI", sans-serif';
        carCtx.fillText('SURVIVE 35 SECONDS TO WIN!', city.width / 2, city.height / 2 + 55);
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
document.getElementById('playAgainBtn').addEventListener('click', resetGame);

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
    }
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
    resetGame();
    requestAnimationFrame(animate);
});
