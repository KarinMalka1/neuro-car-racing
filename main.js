/**
 * Main Simulation Orchestrator & Genetic Evolution Loop
 * Features:
 * - Pre-trained Champion AI (Drives like a pro out of the box!)
 * - Live Human Player Racing (WASD/Arrows + Shift for Nitro Boost)
 * - Real-Time Race Leaderboard, Speedometer & Lap Timers
 * - Drift Tire Skid Marks, Particle Exhaust & Confetti Celebrations
 */

const POPULATION_SIZE = 60; // 60 cars for buttery smooth 60fps
const STORAGE_KEY = 'neuro_car_best_brain';

// Canvas Setup
const carCanvas = document.getElementById('carCanvas');
const networkCanvas = document.getElementById('networkCanvas');
const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

// Simulation State
let track = new Track();
let cars = [];
let bestCar = null;
let championBrain = null;
let generation = 1;
let maxFitnessRecord = 0;
let isPaused = false;
let simSpeed = 1;
let mutationRate = 0.20;
let soundEnabled = true; // Default ON for demo impact!
let evolveDelay = 0;

// Visual Effects State
let skidMarks = [];
let particles = [];
let bannerNotification = { text: '', frames: 0, color: '#39ff14' };

// Human Player State
let playerCar = null;
let playerEnabled = true;
const humanKeys = {
    forward: false,
    reverse: false,
    left: false,
    right: false,
    boost: false
};

// Web Audio API Procedural Synthesizer
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

        if (type === 'checkpoint') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'lap') {
            // Victory Fanfare Chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'evolve') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(540, now + 0.25);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        // Fallback
    }
}

// Celebration Handler
window.triggerCelebration = function(lapTime) {
    bannerNotification = {
        text: `🏁 NEW LAP RECORD: ${lapTime}s!`,
        frames: 180, // 3 seconds
        color: '#ffcc00'
    };
    playSound('lap');

    // Spawn 80 confetti particles at finish line
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: track.start.x + (Math.random() - 0.5) * 60,
            y: track.start.y + (Math.random() - 0.5) * 60,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 3,
            color: ['#00f3ff', '#39ff14', '#ff007f', '#ffe600', '#ff5500'][Math.floor(Math.random() * 5)],
            size: Math.random() * 5 + 3,
            life: 90
        });
    }
};

// Population Generation
function generateCars(N, baseBrain = null) {
    const newCars = [];
    for (let i = 0; i < N; i++) {
        let brain;
        if (baseBrain) {
            brain = NeuralNetwork.clone(baseBrain);
            if (i > 0) {
                // Elite clone stays pure; others have subtle variations
                const dynamicRate = (i > N * 0.75) ? mutationRate * 1.5 : mutationRate;
                NeuralNetwork.mutate(brain, dynamicRate, 0.25);
            }
        } else {
            brain = new NeuralNetwork([5, 6, 4]);
        }
        const car = new Car(track.start.x, track.start.y, track.start.angle, brain, 'AI');
        car.sensor.update(track.borders);
        newCars.push(car);
    }
    return newCars;
}

function init() {
    initAudio();

    // Load saved brain or default to Pre-Trained Champion Brain!
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        championBrain = NeuralNetwork.deserialize(saved);
        console.log("Loaded custom brain from LocalStorage.");
    } else {
        // Pre-trained out of the box!
        championBrain = NeuralNetwork.deserialize(NeuralNetwork.DEFAULT_CHAMPION);
        console.log("Loaded Pro Champion Brain by default!");
    }

    cars = generateCars(POPULATION_SIZE, championBrain);
    bestCar = cars[0];

    // Spawn Player Car (Orange)
    playerCar = new Car(track.start.x, track.start.y, track.start.angle, null, 'HUMAN');
    playerCar.sensor.update(track.borders);

    updateUI();
    requestAnimationFrame(animate);
}

// Evolution Step
function nextGeneration() {
    let genBest = cars[0];
    for (let i = 1; i < cars.length; i++) {
        if (cars[i].fitness > genBest.fitness) {
            genBest = cars[i];
        }
    }

    if (genBest.fitness > maxFitnessRecord) {
        maxFitnessRecord = genBest.fitness;
        championBrain = NeuralNetwork.clone(genBest.brain);
    } else if (!championBrain) {
        championBrain = NeuralNetwork.clone(genBest.brain);
    }

    generation++;
    playSound('evolve');

    cars = generateCars(POPULATION_SIZE, championBrain);
    bestCar = cars[0];
    evolveDelay = 0;
    updateUI();
}

// Main Game Loop
function animate() {
    if (!isPaused) {
        for (let step = 0; step < simSpeed; step++) {
            updatePhysics();
        }
    }

    render();
    requestAnimationFrame(animate);
}

function updatePhysics() {
    // 1. Update Human Player Car
    if (playerEnabled && playerCar) {
        playerCar.controls.forward = humanKeys.forward ? 1 : 0;
        playerCar.controls.reverse = humanKeys.reverse ? 1 : 0;
        playerCar.controls.left = humanKeys.left ? 1 : 0;
        playerCar.controls.right = humanKeys.right ? 1 : 0;
        playerCar.controls.boost = humanKeys.boost ? 1 : 0;
        playerCar.update(track.borders, track.checkpoints);

        // Add skid marks on sharp drift
        if (playerCar.isSkidding) {
            skidMarks.push({ x: playerCar.x, y: playerCar.y, alpha: 0.6 });
            if (skidMarks.length > 250) skidMarks.shift();
        }

        // Add exhaust smoke
        if (playerCar.speed > 1 && Math.random() < 0.4) {
            particles.push({
                x: playerCar.x + Math.sin(playerCar.angle) * 16,
                y: playerCar.y + Math.cos(playerCar.angle) * 16,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                color: playerCar.isBoosting ? '#00f3ff' : 'rgba(255, 255, 255, 0.4)',
                size: Math.random() * 4 + 2,
                life: 25
            });
        }
    }

    // 2. Update all AI Cars
    let aliveCount = 0;
    let highestFitness = -1;
    let currentLeader = bestCar;

    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        car.update(track.borders, track.checkpoints);

        if (!car.damaged) {
            aliveCount++;
            if (car.fitness > highestFitness) {
                highestFitness = car.fitness;
                currentLeader = car;
            }
        }
    }

    if (currentLeader) {
        if (currentLeader.checkpointsPassed > bestCar.checkpointsPassed) {
            playSound('checkpoint');
        }
        bestCar = currentLeader;
    }

    // Generation Evolution Trigger
    if (aliveCount === 0) {
        evolveDelay++;
        if (evolveDelay > 45) {
            nextGeneration();
            aliveCount = POPULATION_SIZE;
        }
    } else {
        evolveDelay = 0;
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Banner Notification
    if (bannerNotification.frames > 0) {
        bannerNotification.frames--;
    }

    // Update Telemetry & Leaderboard UI
    updateTelemetry(aliveCount, Math.max(highestFitness, maxFitnessRecord));
}

function updateTelemetry(aliveCount, fit) {
    document.getElementById('aliveVal').textContent = (aliveCount === 0 && evolveDelay > 0) ? 'Evolving...' : aliveCount;
    document.getElementById('fitnessVal').textContent = Math.floor(fit);

    if (playerCar) {
        // Speedometer in KM/H
        const speedKmh = Math.round(Math.abs(playerCar.speed) * 32);
        document.getElementById('speedKmhVal').textContent = speedKmh;

        // Current Lap Timer
        const curSec = (playerCar.currentLapFrames / 60).toFixed(1);
        document.getElementById('currentLapVal').textContent = `${curSec}s`;

        // Best Lap
        document.getElementById('bestLapVal').textContent = playerCar.bestLapSeconds ? `${playerCar.bestLapSeconds}s` : '--';

        // Calculate Race Rank: Compare player fitness with AI leader
        const playerRank = (playerCar.fitness >= (bestCar ? bestCar.fitness : 0)) ? '🥇 1st' : '🥈 2nd';
        document.getElementById('rankVal').textContent = playerRank;
        document.getElementById('playerLapVal').textContent = playerCar.laps;
    }
}

function render() {
    // Clear Main Circuit
    carCtx.fillStyle = '#0a0e17';
    carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);

    networkCtx.fillStyle = '#0e1320';
    networkCtx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);

    // 1. Draw Track Surface & Boundaries
    track.draw(carCtx);

    // 2. Draw Skid Marks
    for (let i = 0; i < skidMarks.length; i++) {
        const s = skidMarks[i];
        carCtx.beginPath();
        carCtx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        carCtx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
        carCtx.fill();
    }

    // 3. Draw AI Population
    for (let i = 0; i < cars.length; i++) {
        if (cars[i] !== bestCar) {
            cars[i].draw(carCtx, false);
        }
    }

    // 4. Draw Champion AI Car with Glow & Sensor Lasers
    if (bestCar) {
        if (bestCar.sensor) bestCar.sensor.draw(carCtx);
        bestCar.draw(carCtx, true);

        // Neural Network Brain HUD
        if (bestCar.brain) Visualizer.drawNetwork(networkCtx, bestCar.brain);
    }

    // 5. Draw Human Player Car (Orange)
    if (playerEnabled && playerCar) {
        playerCar.draw(carCtx);
    }

    // 6. Draw Particle Effects (Smoke, Confetti)
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        carCtx.beginPath();
        carCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        carCtx.fillStyle = p.color;
        carCtx.fill();
    }

    // 7. Draw Celebration / Evolution Banners
    if (bannerNotification.frames > 0) {
        drawBanner(bannerNotification.text, bannerNotification.color);
    } else if (evolveDelay > 0) {
        drawBanner(`🧬 Generation Complete! Evolving Gen ${generation + 1}...`, '#39ff14');
    }
}

function drawBanner(text, color) {
    carCtx.save();
    carCtx.fillStyle = 'rgba(7, 10, 18, 0.85)';
    carCtx.fillRect(carCanvas.width / 2 - 220, 20, 440, 44);
    carCtx.strokeStyle = color;
    carCtx.lineWidth = 2;
    carCtx.strokeRect(carCanvas.width / 2 - 220, 20, 440, 44);

    carCtx.fillStyle = color;
    carCtx.shadowColor = color;
    carCtx.shadowBlur = 10;
    carCtx.font = 'bold 16px "Segoe UI", sans-serif';
    carCtx.textAlign = 'center';
    carCtx.fillText(text, carCanvas.width / 2, 48);
    carCtx.restore();
}

function updateUI() {
    document.getElementById('genVal').textContent = generation;
    document.getElementById('fitnessVal').textContent = Math.floor(maxFitnessRecord);
    document.getElementById('mutationVal').textContent = `${Math.round(mutationRate * 100)}%`;
}

// UI Event Listeners
document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    document.getElementById('pauseBtn').classList.toggle('active', isPaused);
});

document.getElementById('nextGenBtn').addEventListener('click', () => {
    nextGeneration();
});

document.getElementById('loadProBtn').addEventListener('click', () => {
    championBrain = NeuralNetwork.deserialize(NeuralNetwork.DEFAULT_CHAMPION);
    cars = generateCars(POPULATION_SIZE, championBrain);
    bestCar = cars[0];
    bannerNotification = { text: '👑 Loaded Champion AI Pro Model!', frames: 120, color: '#00f3ff' };
    updateUI();
});

document.getElementById('saveBtn').addEventListener('click', () => {
    if (bestCar && bestCar.brain) {
        localStorage.setItem(STORAGE_KEY, NeuralNetwork.serialize(bestCar.brain));
        const btn = document.getElementById('saveBtn');
        const orig = btn.textContent;
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Reset to Gen 1 with completely random weights (Train from scratch)?")) {
        localStorage.removeItem(STORAGE_KEY);
        championBrain = null;
        generation = 1;
        maxFitnessRecord = 0;
        cars = generateCars(POPULATION_SIZE, null);
        bestCar = cars[0];
        if (playerCar) {
            playerCar.x = track.start.x;
            playerCar.y = track.start.y;
            playerCar.angle = track.start.angle;
            playerCar.speed = 0;
            playerCar.laps = 0;
            playerCar.currentLapFrames = 0;
            playerCar.bestLapSeconds = null;
        }
        updateUI();
    }
});

// Speed Multipliers
const speedBtns = document.querySelectorAll('.speed-btn');
speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        simSpeed = parseInt(btn.dataset.speed, 10);
    });
});

// Mutation slider
const mutationSlider = document.getElementById('mutationSlider');
mutationSlider.addEventListener('input', (e) => {
    mutationRate = parseFloat(e.target.value);
    document.getElementById('mutationVal').textContent = `${Math.round(mutationRate * 100)}%`;
});

// Audio Toggle
const audioBtn = document.getElementById('audioBtn');
audioBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    audioBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    audioBtn.classList.toggle('active', soundEnabled);
});

// Keyboard Controls (WASD / Arrows + Shift Boost)
window.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'ArrowUp' || e.code === 'KeyW') {
        humanKeys.forward = true;
        e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.code === 'KeyS') {
        humanKeys.reverse = true;
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        humanKeys.left = true;
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        humanKeys.right = true;
        e.preventDefault();
    } else if (e.key === 'Shift') {
        humanKeys.boost = true;
    }

    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('pauseBtn').click();
    } else if (e.key === 'n' || e.key === 'N') {
        nextGeneration();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.code === 'KeyW') humanKeys.forward = false;
    else if (e.key === 'ArrowDown' || e.code === 'KeyS') humanKeys.reverse = false;
    else if (e.key === 'ArrowLeft' || e.code === 'KeyA') humanKeys.left = false;
    else if (e.key === 'ArrowRight' || e.code === 'KeyD') humanKeys.right = false;
    else if (e.key === 'Shift') humanKeys.boost = false;
});

window.addEventListener('DOMContentLoaded', init);
