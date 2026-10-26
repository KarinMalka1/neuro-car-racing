/**
 * Neural Network Architecture & Genetic Mutation
 * Multi-layer perceptron (Feedforward neural network) built from scratch.
 */

class NeuralNetwork {
    /**
     * @param {number[]} neuronCounts - [5, 6, 4] for [input, hidden, output]
     */
    constructor(neuronCounts = [5, 6, 4]) {
        this.levels = [];
        for (let i = 0; i < neuronCounts.length - 1; i++) {
            this.levels.push(new Level(neuronCounts[i], neuronCounts[i + 1]));
        }
    }

    /**
     * Propagate input signals through all network layers.
     * @param {number[]} givenInputs - Raw sensor readings [0..1]
     * @returns {number[]} Output activation values [0 or 1]
     */
    static feedForward(givenInputs, network) {
        let outputs = Level.feedForward(givenInputs, network.levels[0]);
        for (let i = 1; i < network.levels.length; i++) {
            outputs = Level.feedForward(outputs, network.levels[i]);
        }
        return outputs;
    }

    /**
     * Mutate network weights and biases using a specified mutation rate and amount.
     * @param {NeuralNetwork} network - Network to mutate in-place
     * @param {number} rate - Probability of mutating a specific weight/bias (0..1)
     * @param {number} amount - Magnitude of perturbation (0..1)
     */
    static mutate(network, rate = 0.2, amount = 0.35) {
        network.levels.forEach(level => {
            // Mutate biases
            for (let i = 0; i < level.biases.length; i++) {
                if (Math.random() < rate) {
                    level.biases[i] += (Math.random() * 2 - 1) * amount;
                    // Clamp to [-1, 1]
                    level.biases[i] = Math.max(-1, Math.min(1, level.biases[i]));
                }
            }
            // Mutate weights
            for (let i = 0; i < level.weights.length; i++) {
                for (let j = 0; j < level.weights[i].length; j++) {
                    if (Math.random() < rate) {
                        level.weights[i][j] += (Math.random() * 2 - 1) * amount;
                        // Clamp to [-1, 1]
                        level.weights[i][j] = Math.max(-1, Math.min(1, level.weights[i][j]));
                    }
                }
            }
        });
    }

    /**
     * Create a deep clone of a neural network.
     */
    static clone(network) {
        const cloned = new NeuralNetwork();
        cloned.levels = network.levels.map(level => {
            const newLevel = new Level(level.inputs.length, level.outputs.length);
            newLevel.biases = [...level.biases];
            newLevel.weights = level.weights.map(row => [...row]);
            return newLevel;
        });
        return cloned;
    }

    /**
     * Serialize to JSON string for LocalStorage.
     */
    static serialize(network) {
        return JSON.stringify(network);
    }

    /**
     * Deserialize from JSON string.
     */
    static deserialize(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const net = new NeuralNetwork();
            net.levels = data.levels.map(l => {
                const lvl = new Level(l.inputs.length, l.outputs.length);
                lvl.biases = [...l.biases];
                lvl.weights = l.weights.map(row => [...row]);
                return lvl;
            });
            return net;
        } catch (e) {
            console.error("Failed to deserialize neural network:", e);
            return null;
        }
    }
}

class Level {
    constructor(inputCount, outputCount) {
        this.inputs = new Array(inputCount);
        this.outputs = new Array(outputCount);
        this.biases = new Array(outputCount);
        this.weights = [];

        for (let i = 0; i < inputCount; i++) {
            this.weights[i] = new Array(outputCount);
        }

        Level.#randomize(this);
    }

    static #randomize(level) {
        for (let i = 0; i < level.inputs.length; i++) {
            for (let j = 0; j < level.outputs.length; j++) {
                // Initialize weights between -1 and 1
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }

        for (let i = 0; i < level.biases.length; i++) {
            // Initialize biases between -1 and 1
            level.biases[i] = Math.random() * 2 - 1;
        }
    }

    /**
     * Computes level outputs using weighted sum + bias, with activation.
     */
    static feedForward(givenInputs, level) {
        for (let i = 0; i < level.inputs.length; i++) {
            level.inputs[i] = givenInputs[i];
        }

        for (let j = 0; j < level.outputs.length; j++) {
            let sum = 0;
            for (let i = 0; i < level.inputs.length; i++) {
                sum += level.inputs[i] * level.weights[i][j];
            }
            sum += level.biases[j];

            // Tanh activation function clamped between -1 and 1
            const activated = Math.tanh(sum);
            // Output activation: > 0 gives positive control command (1), else 0
            level.outputs[j] = activated > 0 ? 1 : 0;
        }

        return level.outputs;
    }
}
