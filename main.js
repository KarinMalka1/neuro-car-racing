/**
 * Main Simulation Orchestrator & Genetic Evolution Loop
 * Supports both AI Auto-Evolution and Interactive Human Player Racing (WASD/Arrows).
 */

const POPULATION_SIZE = 100;
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
let soundEnabled = false;

// Human Player State
let playerCar = null;
let playerEnabled = true;
const humanKeys = {
    forward: false,
    reverse: false,
    left: false,
    right: false
};

// Audio System (Web Audio API)
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'checkpoint') {
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'evolve') {
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        // Audio error silent fallback
    }
}

// Initialize Population & Player
function generateCars(N, baseBrain = null) {
    const newCars = [];
    for (let i = 0; i < N; i++) {
        let brain;
        if (baseBrain) {
            brain = NeuralNetwork.clone(baseBrain);
            if (i > 0) {
                // Elitism: Index 0 is exact clone; others mutated
                const dynamicRate = (i > N * 0.85) ? mutationRate * 1.8 : mutationRate;
                NeuralNetwork.mutate(brain, dynamicRate, 0.35);
            }
        } else {
            brain = new NeuralNetwork([5, 6, 4]);
        }
        newCars.push(new Car(track.start.x, track.start.y, track.start.angle, brain, 'AI'));
    }
    return newCars;
}

function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        championBrain = NeuralNetwork.deserialize(saved);
        console.log("Loaded champion brain from LocalStorage.");
    }

    cars = generateCars(POPULATION_SIZE, championBrain);
    bestCar = cars[0];

    // Spawn Player Car (Orange)
    playerCar = new Car(track.start.x, track.start.y, track.start.angle, null, 'HUMAN');

    updateUI();
    requestAnimationFrame(animate);
}

// Evolve to Next Generation
function nextGeneration() {
    // 1. Find best performing car from current generation
    let genBest = cars[0];
    for (let i = 1; i < cars.length; i++) {
        if (cars[i].fitness > genBest.fitness) {
            genBest = cars[i];
        }
    }

    // Update global record
    if (genBest.fitness > maxFitnessRecord) {
        maxFitnessRecord = genBest.fitness;
        championBrain = NeuralNetwork.clone(genBest.brain);
    } else if (!championBrain) {
        championBrain = NeuralNetwork.clone(genBest.brain);
    }

    generation++;
    playSound('evolve');

    // 2. Spawn new population using champion brain
    cars = generateCars(POPULATION_SIZE, championBrain);
    bestCar = cars[0];
    updateUI();
}

// Main Game/Sim Loop
function animate(time) {
    if (!isPaused) {
        // Multiple physics steps per frame according to simSpeed
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
        playerCar.update(track.borders, track.checkpoints);

        const playerLapEl = document.getElementById('playerLapVal');
        if (playerLapEl) {
            playerLapEl.textContent = playerCar.laps;
        }
    }

    // 2. Update all AI cars
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

    // Check if generation should end
    if (aliveCount === 0) {
        nextGeneration();
    }

    // Update stats UI
    document.getElementById('aliveVal').textContent = aliveCount;
    document.getElementById('fitnessVal').textContent = Math.floor(Math.max(highestFitness, maxFitnessRecord));
}

function render() {
    // Clear Canvases
    carCtx.fillStyle = '#0a0e17';
    carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);

    networkCtx.fillStyle = '#0e1320';
    networkCtx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);

    // 1. Draw Track
    track.draw(carCtx);

    // 2. Draw AI Population
    for (let i = 0; i < cars.length; i++) {
        if (cars[i] !== bestCar) {
            cars[i].draw(carCtx, false);
        }
    }

    // 3. Draw Champion Car with Glow & Sensor Rays
    if (bestCar) {
        bestCar.sensor.draw(carCtx);
        bestCar.draw(carCtx, true);

        // 4. Draw Neural Network Brain
        Visualizer.drawNetwork(networkCtx, bestCar.brain);
    }

    // 5. Draw Human Player Car (Orange)
    if (playerEnabled && playerCar) {
        playerCar.draw(carCtx);
    }
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
    if (confirm("Reset simulation to Generation 1 with random weights?")) {
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
        }
        updateUI();
    }
});

// Drive Mode Toggle
const playerToggleBtn = document.getElementById('playerToggleBtn');
if (playerToggleBtn) {
    playerToggleBtn.addEventListener('click', () => {
        playerEnabled = !playerEnabled;
        playerToggleBtn.textContent = playerEnabled ? '🎮 Player: ACTIVE' : '🎮 Player: OFF';
        playerToggleBtn.classList.toggle('active', playerEnabled);
    });
}

// Speed multipliers
const speedBtns = document.querySelectorAll('.speed-btn');
speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        simSpeed = parseInt(btn.dataset.speed, 10);
    });
});

// Mutation rate slider
const mutationSlider = document.getElementById('mutationSlider');
mutationSlider.addEventListener('input', (e) => {
    mutationRate = parseFloat(e.target.value);
    document.getElementById('mutationVal').textContent = `${Math.round(mutationRate * 100)}%`;
});

// Audio toggle
const audioBtn = document.getElementById('audioBtn');
audioBtn.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    audioBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    audioBtn.classList.toggle('active', soundEnabled);
});

// Keyboard Controls for Human Player (WASD & Arrow Keys)
window.addEventListener('keydown', (e) => {
    // Player driving keys
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
    }

    // Simulation shortcuts
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('pauseBtn').click();
    } else if (e.key === 'n' || e.key === 'N') {
        nextGeneration();
    } else if (e.key === '1') {
        document.querySelector('[data-speed="1"]').click();
    } else if (e.key === '2') {
        document.querySelector('[data-speed="2"]').click();
    } else if (e.key === '4') {
        document.querySelector('[data-speed="4"]').click();
    } else if (e.key === '0') {
        document.querySelector('[data-speed="10"]').click();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.code === 'KeyW') {
        humanKeys.forward = false;
    } else if (e.key === 'ArrowDown' || e.code === 'KeyS') {
        humanKeys.reverse = false;
    } else if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        humanKeys.left = false;
    } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        humanKeys.right = false;
    }
});

// Start the engine
window.addEventListener('DOMContentLoaded', init);
