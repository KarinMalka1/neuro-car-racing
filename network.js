/**
 * Neural Network Architecture & Genetic Mutation
 * Multi-layer perceptron (Feedforward neural network) built from scratch.
 */

class NeuralNetwork {
    /**
     * Pre-trained champion brain that already knows how to drive smoothly around the track!
     */
    static DEFAULT_CHAMPION = {"levels":[{"inputs":[null,null,null,null,null],"outputs":[null,null,null,null,null,null],"biases":[-0.19605273233481174,0.34700374512770477,-0.41072120105610144,0.44250489184570363,-0.23631489183882864,0.8024657631169512],"weights":[[0.03843945483772693,-0.8310523733201943,1,-0.6046538180918029,0.24131641444380172,0.874773036206506],[0.98095051793316,0.9156529116992785,0.38995433066459617,0.7797412003277334,0.38468634179582395,-0.46492387356794784],[0.8300814154822473,0.12297103321025227,0.8394786109641439,0.07184714971078812,-0.454081642994894,-0.7261678128536733],[0.5268314597761238,-0.40980302114078837,-0.5937554643050198,1,0.11240345246084314,-0.13161740025610377],[-0.5867827587412688,0.002884445650489042,-0.005868038488426722,0.8210995586583414,0.9270912037524135,-0.8767617720943973]]},{"inputs":[null,null,null,null,null,null],"outputs":[null,null,null,null],"biases":[0.6674777771001872,-1,0.6523069300987692,-0.22708048011492699],"weights":[[0.05198189444150739,0.6096672148000337,-0.6532533438612621,-0.2923422704839464],[-0.6626453783769175,-0.2401892987345326,0.18308445709543694,1],[-0.7305991451825296,-0.8551991198433849,-0.2900862481555303,0.9854086541485958],[0.9679804709577138,0.5198333641394919,0.06870462861653655,-0.802840267996412],[0.6809533228239059,0.5208874464204497,0.44707171289087255,-0.6409156377595023],[0.74206632134211,-0.7028869769579851,-0.462152985813152,0.6285607576697644]]}]};

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
                    level.biases[i] = Math.max(-1, Math.min(1, level.biases[i]));
                }
            }
            // Mutate weights
            for (let i = 0; i < level.weights.length; i++) {
                for (let j = 0; j < level.weights[i].length; j++) {
                    if (Math.random() < rate) {
                        level.weights[i][j] += (Math.random() * 2 - 1) * amount;
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
     * Deserialize from JSON string or object.
     */
    static deserialize(source) {
        try {
            const data = (typeof source === 'string') ? JSON.parse(source) : source;
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
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }

        for (let i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random() * 2 - 1;
        }
    }

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

            const activated = Math.tanh(sum);
            level.outputs[j] = activated > 0 ? 1 : 0;
        }

        return level.outputs;
    }
}
