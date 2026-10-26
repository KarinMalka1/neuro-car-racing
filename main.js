/**
 * Grand Prix Championship & 2-Player Racing Engine
 * Never ends early! The race continues until someone completes a full circle to WIN!
 */

// Canvas Setup
const carCanvas = document.getElementById('carCanvas');
const networkCanvas = document.getElementById('networkCanvas');
const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

// Game State
let track = new Track();
let gameMode = 'VS_AI'; // 'VS_AI' or '2_PLAYER'
let gameState = 'COUNTDOWN'; // 'COUNTDOWN', 'RACING', 'FINISHED'
let countdownTimer = 180; // 3 seconds (60 frames/sec)
let winnerCar = null;

// Cars
let player1 = null; // Orange Car (Arrow Keys)
let player2 = null; // Purple Car (WASD in 2-Player mode)
let aiCars = [];    // AI Swarm (in VS_AI mode)
let aiChampion = null;
let championBrain = null;

// Visual Effects
let skidMarks = [];
let particles = [];
let confetti = [];
let soundEnabled = true;

// Key Tracking
const keysP1 = { forward: false, reverse: false, left: false, right: false, boost: false };
const keysP2 = { forward: false, reverse: false, left: false, right: false, boost: false };

// Web Audio API
let audioCtx = null;
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

        if (type === 'beep') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now); // A4
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'go') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now); // A5
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'victory') {
            // Fanfare chords
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, now + idx * 0.1);
                g.gain.setValueAtTime(0.12, now + idx * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
                o.start(now + idx * 0.1);
                o.stop(now + idx * 0.1 + 0.4);
            });
        }
    } catch (e) {
        // Fallback
    }
}

// Initialize Cars
function setupRace() {
    // Offset spawn positions along start line
    const sx = track.start.x;
    const sy = track.start.y;
    const sa = track.start.angle;

    // Player 1 (Orange)
    player1 = new Car(sx, sy, sa, null, 'PLAYER1');

    if (gameMode === '2_PLAYER') {
        // Player 2 (Purple)
        player2 = new Car(sx + 15, sy - 15, sa, null, 'PLAYER2');
        aiCars = [];
        aiChampion = null;
    } else {
        // Solo vs AI
        player2 = null;
        if (!championBrain) {
            championBrain = NeuralNetwork.deserialize(NeuralNetwork.DEFAULT_CHAMPION);
        }
        aiCars = [];
        // Spawn 15 AI racers
        for (let i = 0; i < 15; i++) {
            let brain = NeuralNetwork.clone(championBrain);
            if (i > 0) NeuralNetwork.mutate(brain, 0.15, 0.25);
            const car = new Car(sx - (i * 4), sy + (i * 6), sa, brain, 'AI');
            aiCars.push(car);
        }
        aiChampion = aiCars[0];
    }

    gameState = 'COUNTDOWN';
    countdownTimer = 180;
    winnerCar = null;
    skidMarks = [];
    particles = [];
    confetti = [];

    // Hide victory popup if open
    document.getElementById('victoryModal').classList.add('hidden');
    updateHUD();
}

// When a Car Crosses the Finish Line
window.onRaceFinished = function(car) {
    if (gameState === 'FINISHED') return;
    gameState = 'FINISHED';
    winnerCar = car;
    playSound('victory');

    // Spawn massive victory confetti explosion
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: carCanvas.width / 2 + (Math.random() - 0.5) * 400,
            y: 100 + Math.random() * 200,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 5 + 2,
            color: ['#00f3ff', '#39ff14', '#ff007f', '#ffe600', '#ff5500', '#a855f7'][Math.floor(Math.random() * 6)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10
        });
    }

    // Determine winner title
    let title = '🏆 PLAYER 1 WINS!';
    let subtitle = 'Orange Car took the checkered flag!';
    if (car.controlType === 'PLAYER2') {
        title = '🏆 PLAYER 2 WINS!';
        subtitle = 'Purple Car took the checkered flag!';
    } else if (car.controlType === 'AI') {
        title = '🤖 AI CHAMPION WINS!';
        subtitle = 'The Neural Network crossed the finish line first!';
    }

    // Show Victory Modal
    document.getElementById('winnerTitle').textContent = title;
    document.getElementById('winnerTime').textContent = `Winning Time: ${car.finalTimeSeconds}s`;
    document.getElementById('winnerSubtitle').textContent = subtitle;
    document.getElementById('victoryModal').classList.remove('hidden');
};

// Main Loop
function animate() {
    updatePhysics();
    render();
    requestAnimationFrame(animate);
}

function updatePhysics() {
    // 1. Handle 3-2-1-GO Countdown
    if (gameState === 'COUNTDOWN') {
        countdownTimer--;
        if (countdownTimer === 120 || countdownTimer === 60) playSound('beep');
        if (countdownTimer === 0) {
            gameState = 'RACING';
            playSound('go');
        }
        return;
    }

    // 2. Update Player 1
    if (player1) {
        player1.controls.forward = keysP1.forward ? 1 : 0;
        player1.controls.reverse = keysP1.reverse ? 1 : 0;
        player1.controls.left = keysP1.left ? 1 : 0;
        player1.controls.right = keysP1.right ? 1 : 0;
        player1.controls.boost = keysP1.boost ? 1 : 0;
        player1.update(track.borders, track.checkpoints);

        if (player1.isSkidding) {
            skidMarks.push({ x: player1.x, y: player1.y, alpha: 0.55 });
            if (skidMarks.length > 200) skidMarks.shift();
        }
    }

    // 3. Update Player 2 (if 2-Player mode)
    if (gameMode === '2_PLAYER' && player2) {
        player2.controls.forward = keysP2.forward ? 1 : 0;
        player2.controls.reverse = keysP2.reverse ? 1 : 0;
        player2.controls.left = keysP2.left ? 1 : 0;
        player2.controls.right = keysP2.right ? 1 : 0;
        player2.controls.boost = keysP2.boost ? 1 : 0;
        player2.update(track.borders, track.checkpoints);

        if (player2.isSkidding) {
            skidMarks.push({ x: player2.x, y: player2.y, alpha: 0.55 });
            if (skidMarks.length > 200) skidMarks.shift();
        }
    }

    // 4. Update AI Swarm (if VS_AI mode)
    if (gameMode === 'VS_AI') {
        for (let i = 0; i < aiCars.length; i++) {
            aiCars[i].update(track.borders, track.checkpoints);
        }
    }

    // 5. Update Confetti
    for (let i = 0; i < confetti.length; i++) {
        const c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.rotSpeed;
        if (c.y > carCanvas.height) c.y = -10;
    }

    updateHUD();
}

function updateHUD() {
    if (player1) {
        document.getElementById('speedKmhVal').textContent = Math.round(Math.abs(player1.speed) * 32);
        const sec = (player1.lapFrames / 60).toFixed(1);
        document.getElementById('currentLapVal').textContent = `${sec}s`;
        document.getElementById('checkpointsVal').textContent = `${player1.checkpointsPassed} / ${track.checkpoints.length}`;

        // Leaderboard check
        let leaderText = '🥇 1st Place';
        if (gameMode === 'VS_AI' && aiChampion && aiChampion.checkpointsPassed > player1.checkpointsPassed) {
            leaderText = '🥈 2nd Place (AI Leading!)';
        } else if (gameMode === '2_PLAYER' && player2 && player2.checkpointsPassed > player1.checkpointsPassed) {
            leaderText = '🥈 2nd Place (P2 Leading!)';
        }
        document.getElementById('rankVal').textContent = leaderText;
    }
}

function render() {
    // Clear Canvases
    carCtx.fillStyle = '#0a0e17';
    carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);

    networkCtx.fillStyle = '#0e1320';
    networkCtx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);

    // 1. Draw Track
    track.draw(carCtx);

    // 2. Draw Skid Marks
    for (let i = 0; i < skidMarks.length; i++) {
        const s = skidMarks[i];
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        carCtx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
        carCtx.fill();
    }

    // 3. Draw AI Swarm
    if (gameMode === 'VS_AI') {
        for (let i = 0; i < aiCars.length; i++) {
            if (aiCars[i] !== aiChampion) aiCars[i].draw(carCtx, false);
        }
        if (aiChampion) {
            aiChampion.sensor.draw(carCtx);
            aiChampion.draw(carCtx, true);
            Visualizer.drawNetwork(networkCtx, aiChampion.brain);
        }
    }

    // 4. Draw Player 2 (Purple)
    if (gameMode === '2_PLAYER' && player2) {
        player2.draw(carCtx);
    }

    // 5. Draw Player 1 (Orange)
    if (player1) {
        player1.draw(carCtx);
    }

    // 6. Draw Countdown (3... 2... 1... GO!)
    if (gameState === 'COUNTDOWN') {
        carCtx.save();
        carCtx.fillStyle = 'rgba(7, 10, 18, 0.7)';
        carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);

        let countText = '3';
        let countColor = '#ff0055';
        if (countdownTimer < 60) {
            countText = '1';
            countColor = '#ffe600';
        } else if (countdownTimer < 120) {
            countText = '2';
            countColor = '#ff5500';
        }

        carCtx.fillStyle = countColor;
        carCtx.shadowColor = countColor;
        carCtx.shadowBlur = 30;
        carCtx.font = 'bold 90px "Segoe UI", sans-serif';
        carCtx.textAlign = 'center';
        carCtx.textBaseline = 'middle';
        carCtx.fillText(countText, carCanvas.width / 2, carCanvas.height / 2 - 20);

        carCtx.fillStyle = '#ffffff';
        carCtx.shadowBlur = 10;
        carCtx.font = 'bold 22px "Segoe UI", sans-serif';
        carCtx.fillText('GET READY TO RACE!', carCanvas.width / 2, carCanvas.height / 2 + 60);
        carCtx.restore();
    }

    // 7. Draw Confetti on Victory
    for (let i = 0; i < confetti.length; i++) {
        const c = confetti[i];
        carCtx.save();
        carCtx.translate(c.x, c.y);
        carCtx.rotate((c.rotation * Math.PI) / 180);
        carCtx.fillStyle = c.color;
        carCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        carCtx.restore();
    }
}

// UI Event Handlers
document.getElementById('restartBtn').addEventListener('click', () => {
    setupRace();
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
    setupRace();
});

document.getElementById('modeVsAiBtn').addEventListener('click', () => {
    gameMode = 'VS_AI';
    document.getElementById('modeVsAiBtn').classList.add('active');
    document.getElementById('mode2PBtn').classList.remove('active');
    document.getElementById('controlsNotice').innerHTML = `
        🔥 <span style="color: #ff5500;">YOU ARE THE ORANGE CAR:</span> Drive with <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> &nbsp;|&nbsp; <span style="color: #00f3ff;">Race the AI Swarm to complete 1 full circle!</span>
    `;
    setupRace();
});

document.getElementById('mode2PBtn').addEventListener('click', () => {
    gameMode = '2_PLAYER';
    document.getElementById('mode2PBtn').classList.add('active');
    document.getElementById('modeVsAiBtn').classList.remove('active');
    document.getElementById('controlsNotice').innerHTML = `
        👥 <b>2-PLAYER LOCAL RACE:</b> &nbsp; 
        <span style="color: #ff5500;">P1 (Orange):</span> <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> Arrows &nbsp;|&nbsp; 
        <span style="color: #a855f7;">P2 (Purple):</span> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> &nbsp;|&nbsp; First to 1 full circle wins!
    `;
    setupRace();
});

// Audio Toggle
const audioBtn = document.getElementById('audioBtn');
audioBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    audioBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    audioBtn.classList.toggle('active', soundEnabled);
});

// Keyboard Controls (P1: Arrows | P2: WASD)
window.addEventListener('keydown', (e) => {
    initAudio();

    // Player 1 (Arrow Keys)
    if (e.key === 'ArrowUp') { keysP1.forward = true; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { keysP1.reverse = true; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { keysP1.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { keysP1.right = true; e.preventDefault(); }
    else if (e.key === 'Shift') { keysP1.boost = true; }

    // If Solo Mode, also allow WASD for Player 1!
    if (gameMode === 'VS_AI') {
        if (e.code === 'KeyW') { keysP1.forward = true; e.preventDefault(); }
        else if (e.code === 'KeyS') { keysP1.reverse = true; e.preventDefault(); }
        else if (e.code === 'KeyA') { keysP1.left = true; e.preventDefault(); }
        else if (e.code === 'KeyD') { keysP1.right = true; e.preventDefault(); }
    } else {
        // Player 2 (WASD)
        if (e.code === 'KeyW') { keysP2.forward = true; e.preventDefault(); }
        else if (e.code === 'KeyS') { keysP2.reverse = true; e.preventDefault(); }
        else if (e.code === 'KeyA') { keysP2.left = true; e.preventDefault(); }
        else if (e.code === 'KeyD') { keysP2.right = true; e.preventDefault(); }
        else if (e.code === 'Space') { keysP2.boost = true; }
    }

    if (e.key === 'r' || e.key === 'R') {
        setupRace();
    }
});

window.addEventListener('keyup', (e) => {
    // Player 1
    if (e.key === 'ArrowUp') keysP1.forward = false;
    else if (e.key === 'ArrowDown') keysP1.reverse = false;
    else if (e.key === 'ArrowLeft') keysP1.left = false;
    else if (e.key === 'ArrowRight') keysP1.right = false;
    else if (e.key === 'Shift') keysP1.boost = false;

    // Solo or Player 2
    if (gameMode === 'VS_AI') {
        if (e.code === 'KeyW') keysP1.forward = false;
        else if (e.code === 'KeyS') keysP1.reverse = false;
        else if (e.code === 'KeyA') keysP1.left = false;
        else if (e.code === 'KeyD') keysP1.right = false;
    } else {
        if (e.code === 'KeyW') keysP2.forward = false;
        else if (e.code === 'KeyS') keysP2.reverse = false;
        else if (e.code === 'KeyA') keysP2.left = false;
        else if (e.code === 'KeyD') keysP2.right = false;
        else if (e.code === 'Space') keysP2.boost = false;
    }
});

// Launch on page load
window.addEventListener('DOMContentLoaded', () => {
    setupRace();
    requestAnimationFrame(animate);
});
