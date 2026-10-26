/**
 * NEON GETAWAY — Police Chase Survival Game Engine
 */

const carCanvas = document.getElementById('carCanvas');
const carCtx = carCanvas.getContext('2d');

// Game State
let city = new CityArena(1060, 700);
let player = null;
let cops = [];
let collectibles = [];
let particles = [];
let skidMarks = [];
let shockwaves = [];

let gameState = 'COUNTDOWN'; // 'COUNTDOWN', 'PLAYING', 'GAME_OVER'
let countdownTimer = 150;
let survivalFrames = 0;
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
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'explosion') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'emp') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'busted') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(196, now + 0.2);
            osc.frequency.setValueAtTime(164.81, now + 0.4);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.start(now);
            osc.stop(now + 0.7);
        }
    } catch (e) {
        // Fallback
    }
}

// Background Police Siren Audio
function updateSirenAudio() {
    if (!soundEnabled || !audioCtx || gameState !== 'PLAYING' || cops.length === 0) {
        if (sirenGain) sirenGain.gain.value = 0;
        return;
    }

    if (!sirenOsc) {
        sirenOsc = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();
        sirenOsc.type = 'sine';
        sirenGain.gain.value = 0.04;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOsc.start();
    }

    const time = audioCtx.currentTime;
    const freq = 650 + Math.sin(time * 3.5) * 220; // 430Hz to 870Hz siren wail
    sirenOsc.frequency.setValueAtTime(freq, time);
    sirenGain.gain.setValueAtTime(0.035, time);
}

// Setup New Game
function resetGame() {
    player = new PlayerCar(city.width / 2, city.height / 2 + 120, 0);
    cops = [];
    collectibles = [];
    particles = [];
    skidMarks = [];
    shockwaves = [];

    gameState = 'COUNTDOWN';
    countdownTimer = 150;
    survivalFrames = 0;
    cashScore = 0;
    wantedLevel = 1;
    screenShake = 0;

    // Spawn 2 initial police cruisers at city corners
    spawnCop(100, 100, false);
    spawnCop(city.width - 100, 100, false);

    // Initial collectibles
    spawnCollectible('CASH');
    spawnCollectible('WRENCH');
    spawnCollectible('EMP');

    document.getElementById('bustedModal').classList.add('hidden');
    updateHUD();
}

function spawnCop(x, y, isSwat = false) {
    cops.push(new CopCar(x, y, isSwat));
}

function spawnCollectible(type = null) {
    const types = ['CASH', 'CASH', 'WRENCH', 'EMP'];
    const chosenType = type || types[Math.floor(Math.random() * types.length)];
    // Random position avoiding buildings
    let x, y, valid = false;
    for (let attempts = 0; attempts < 30; attempts++) {
        x = 70 + Math.random() * (city.width - 140);
        y = 70 + Math.random() * (city.height - 140);
        let inBuilding = false;
        for (const b of city.buildings) {
            if (x > b.x - 20 && x < b.x + b.w + 20 && y > b.y - 20 && y < b.y + b.h + 20) inBuilding = true;
        }
        if (Math.hypot(x - city.roundabout.x, y - city.roundabout.y) < city.roundabout.radius + 30) inBuilding = true;
        if (!inBuilding) { valid = true; break; }
    }
    if (valid) collectibles.push(new Collectible(x, y, chosenType));
}

// Trigger EMP Shockwave Blast
function triggerEMP() {
    if (!player || player.empCharges <= 0 || gameState !== 'PLAYING') return;
    player.empCharges--;
    playSound('emp');
    screenShake = 18;

    shockwaves.push({ x: player.x, y: player.y, radius: 10, maxRadius: 280, life: 30 });

    // Blast all cops within radius
    for (const cop of cops) {
        const dist = Math.hypot(cop.x - player.x, cop.y - player.y);
        if (dist < 280) {
            cop.hp -= 35;
            const blastAngle = Math.atan2(cop.y - player.y, cop.x - player.x);
            cop.x += Math.cos(blastAngle) * 55;
            cop.y += Math.sin(blastAngle) * 55;
            cop.speed = -3.5;
            if (cop.hp <= 0) triggerExplosion(cop.x, cop.y, true);
        }
    }
    updateHUD();
}

function triggerExplosion(x, y, addCash = true) {
    playSound('explosion');
    screenShake = 14;

    if (addCash) {
        cashScore += 1000;
        showFloatingText('+$1,000 WRECKED!', x, y, '#39ff14');
    }

    // Fire & debris particles
    for (let i = 0; i < 35; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 9,
            vy: (Math.random() - 0.5) * 9,
            color: ['#ff0055', '#ff5500', '#ffe600', '#ffffff', '#64748b'][Math.floor(Math.random() * 5)],
            size: Math.random() * 6 + 3,
            life: 40
        });
    }
}

let floatingTexts = [];
function showFloatingText(text, x, y, color = '#ffffff') {
    floatingTexts.push({ text, x, y, color, life: 50, vy: -1.2 });
}

// Main Physics Loop
function updatePhysics() {
    updateSirenAudio();

    if (gameState === 'COUNTDOWN') {
        countdownTimer--;
        if (countdownTimer === 100 || countdownTimer === 50) playSound('crash');
        if (countdownTimer <= 0) {
            gameState = 'PLAYING';
            playSound('coin');
        }
        return;
    }

    if (gameState !== 'PLAYING') return;

    survivalFrames++;
    const currentSeconds = (survivalFrames / 60).toFixed(1);

    // 1. Wanted Level Scaling
    if (survivalFrames < 900) wantedLevel = 1;       // 0-15s
    else if (survivalFrames < 1800) wantedLevel = 2; // 15-30s
    else if (survivalFrames < 2700) wantedLevel = 3; // 30-45s
    else if (survivalFrames < 3600) wantedLevel = 4; // 45-60s
    else wantedLevel = 5;                            // 60s+

    // 2. Spawn Police reinforcements periodically
    const targetCopCount = wantedLevel * 2;
    if (cops.length < targetCopCount && survivalFrames % 120 === 0) {
        // Spawn from city edge
        const spawnX = Math.random() < 0.5 ? 80 : city.width - 80;
        const spawnY = Math.random() < 0.5 ? 80 : city.height - 80;
        const isSwat = (wantedLevel >= 3 && Math.random() < 0.4);
        spawnCop(spawnX, spawnY, isSwat);
    }

    // 3. Spawn Collectibles
    if (collectibles.length < 4 && survivalFrames % 240 === 0) {
        spawnCollectible();
    }

    // 4. Update Player Car
    player.controls.forward = keys.forward ? 1 : 0;
    player.controls.reverse = keys.reverse ? 1 : 0;
    player.controls.left = keys.left ? 1 : 0;
    player.controls.right = keys.right ? 1 : 0;
    player.controls.boost = keys.boost ? 1 : 0;
    player.update(city.borders);

    if (player.isSkidding) {
        skidMarks.push({ x: player.x, y: player.y, alpha: 0.6 });
        if (skidMarks.length > 250) skidMarks.shift();
    }

    // 5. Update Cop AI & Cop-to-Cop collisions
    for (let i = cops.length - 1; i >= 0; i--) {
        const cop = cops[i];
        cop.update(player, city.borders, cops);

        // Check crash with Player
        if (CarUtils.polysIntersect(player.polygon, [cop.polygon[0], cop.polygon[2]])) {
            playSound('crash');
            screenShake = 10;
            const damage = cop.isSwat ? 18 : 10;
            player.hp = Math.max(0, player.hp - damage);
            cop.hp -= 20;

            // Bounce back
            player.speed = -1.5;
            cop.speed = -2.0;

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

    // 6. Collectibles collision
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const item = collectibles[i];
        if (Math.hypot(player.x - item.x, player.y - item.y) < player.width + item.radius) {
            playSound('coin');
            if (item.type === 'CASH') {
                cashScore += 500;
                showFloatingText('+$500 CASH', item.x, item.y, '#ffe600');
            } else if (item.type === 'WRENCH') {
                player.hp = Math.min(player.maxHp, player.hp + 35);
                showFloatingText('+35% REPAIRED', item.x, item.y, '#39ff14');
            } else if (item.type === 'EMP') {
                player.empCharges = Math.min(3, player.empCharges + 1);
                showFloatingText('+1 EMP CHARGE ⚡', item.x, item.y, '#00f3ff');
            }
            collectibles.splice(i, 1);
        }
    }

    // 7. Update Particles & Shockwaves
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
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
        f.y += f.vy;
        f.life--;
        if (f.life <= 0) floatingTexts.splice(i, 1);
    }

    // 8. Check BUSTED (Game Over)
    if (player.hp <= 0) {
        gameOver();
    }

    updateHUD();
}

function gameOver() {
    gameState = 'GAME_OVER';
    playSound('busted');
    triggerExplosion(player.x, player.y, false);

    const seconds = (survivalFrames / 60).toFixed(1);
    if (parseFloat(seconds) > parseFloat(bestSurvivalSeconds)) {
        bestSurvivalSeconds = seconds;
        localStorage.setItem('neon_getaway_best', seconds);
    }

    document.getElementById('bustedSurviveTime').textContent = `${seconds}s`;
    document.getElementById('bustedCash').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('bustedStars').textContent = '⭐'.repeat(wantedLevel);
    document.getElementById('bustedBest').textContent = `${bestSurvivalSeconds}s`;
    document.getElementById('bustedModal').classList.remove('hidden');
}

function updateHUD() {
    if (!player) return;

    // Health Bar
    const hpPercent = Math.max(0, Math.round((player.hp / player.maxHp) * 100));
    const hpBar = document.getElementById('hpFill');
    if (hpBar) {
        hpBar.style.width = `${hpPercent}%`;
        hpBar.style.background = hpPercent > 40 ? 'linear-gradient(90deg, #39ff14, #00f3ff)' : 'linear-gradient(90deg, #ff0055, #ff5500)';
    }
    document.getElementById('hpVal').textContent = `${hpPercent}%`;

    // Wanted Stars
    document.getElementById('wantedStars').textContent = '⭐'.repeat(wantedLevel);

    // Speedometer & Timers
    document.getElementById('speedKmhVal').textContent = Math.round(Math.abs(player.speed) * 32);
    document.getElementById('surviveTimeVal').textContent = `${(survivalFrames / 60).toFixed(1)}s`;
    document.getElementById('cashScoreVal').textContent = `$${cashScore.toLocaleString()}`;
    document.getElementById('copsCountVal').textContent = cops.length;

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

    // Screen Shake effect on crashes
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        carCtx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    // 1. Draw City Arena
    city.draw(carCtx);

    // 2. Draw Skid Marks
    for (let i = 0; i < skidMarks.length; i++) {
        const s = skidMarks[i];
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        carCtx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
        carCtx.fill();
    }

    // 3. Draw Collectibles
    for (const item of collectibles) item.draw(carCtx);

    // 4. Draw Police Cruisers
    for (const cop of cops) cop.draw(carCtx);

    // 5. Draw Player Car
    if (player && gameState !== 'GAME_OVER') player.draw(carCtx);

    // 6. Draw EMP Shockwaves
    for (const s of shockwaves) {
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        carCtx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
        carCtx.shadowColor = '#00f3ff';
        carCtx.shadowBlur = 25;
        carCtx.lineWidth = 4;
        carCtx.stroke();
    }

    // 7. Draw Particles
    for (const p of particles) {
        carCtx.beginPath();
        carCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        carCtx.fillStyle = p.color;
        carCtx.shadowColor = p.color;
        carCtx.shadowBlur = 8;
        carCtx.fill();
    }

    // 8. Draw Floating Popups
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

    // 9. Countdown Display (GET READY)
    if (gameState === 'COUNTDOWN') {
        carCtx.fillStyle = 'rgba(7, 10, 18, 0.75)';
        carCtx.fillRect(0, 0, city.width, city.height);

        carCtx.fillStyle = '#ff0055';
        carCtx.shadowColor = '#ff0055';
        carCtx.shadowBlur = 30;
        carCtx.font = 'bold 80px "Segoe UI", sans-serif';
        carCtx.textAlign = 'center';
        carCtx.textBaseline = 'middle';
        carCtx.fillText('🚨 GETAWAY!', city.width / 2, city.height / 2 - 25);

        carCtx.fillStyle = '#ffffff';
        carCtx.shadowBlur = 10;
        carCtx.font = 'bold 20px "Segoe UI", sans-serif';
        carCtx.fillText('LOSE THE POLICE & SURVIVE AS LONG AS YOU CAN!', city.width / 2, city.height / 2 + 55);
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
