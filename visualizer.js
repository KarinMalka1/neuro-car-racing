/**
 * Real-Time Neural Network Brain Visualizer
 * Draws nodes, activations, and synaptic connection weights.
 */

class Visualizer {
    /**
     * Draw the neural network on the specified canvas context.
     * @param {CanvasRenderingContext2D} ctx
     * @param {NeuralNetwork} network
     */
    static drawNetwork(ctx, network) {
        if (!network || !network.levels) return;

        const margin = 20;
        const left = margin;
        const top = margin;
        const width = ctx.canvas.width - margin * 2;
        const height = ctx.canvas.height - margin * 2;

        const levelHeight = height / network.levels.length;

        // Render from output level to input level
        for (let i = network.levels.length - 1; i >= 0; i--) {
            const levelTop = top + Visualizer.lerp(
                height - levelHeight,
                0,
                network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1)
            );

            Visualizer.drawLevel(
                ctx,
                network.levels[i],
                left,
                levelTop,
                width,
                levelHeight,
                i === network.levels.length - 1 ? ['▲ ACCEL', '▼ REVERSE', '◄ LEFT', '► RIGHT'] : []
            );
        }
    }

    static drawLevel(ctx, level, left, top, width, height, outputLabels) {
        const right = left + width;
        const bottom = top + height;

        const { inputs, outputs, weights, biases } = level;
        const nodeRadius = 14;

        // 1. Draw Synaptic Connections (Weights)
        for (let i = 0; i < inputs.length; i++) {
            for (let j = 0; j < outputs.length; j++) {
                const x1 = Visualizer.#getNodeX(inputs, i, left, right);
                const y1 = bottom;
                const x2 = Visualizer.#getNodeX(outputs, j, left, right);
                const y2 = top;

                const weight = weights[i][j];
                const alpha = Math.min(1, Math.abs(weight) * 0.8 + 0.15);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineWidth = Math.max(1, Math.abs(weight) * 2.5);
                ctx.strokeStyle = weight > 0
                    ? `rgba(0, 243, 255, ${alpha})`   // Cyan for positive weights
                    : `rgba(255, 0, 127, ${alpha})`;  // Magenta for negative weights
                ctx.stroke();
            }
        }

        // 2. Draw Input Nodes
        for (let i = 0; i < inputs.length; i++) {
            const x = Visualizer.#getNodeX(inputs, i, left, right);
            const y = bottom;
            const val = inputs[i] || 0;

            ctx.beginPath();
            ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0e17';
            ctx.fill();

            // Inner glow based on activation
            ctx.beginPath();
            ctx.arc(x, y, nodeRadius * Math.max(0.2, val), 0, Math.PI * 2);
            ctx.fillStyle = val > 0.5 ? '#ff0055' : '#00f3ff';
            ctx.shadowColor = val > 0.5 ? '#ff0055' : '#00f3ff';
            ctx.shadowBlur = val * 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff88';
            ctx.stroke();
        }

        // 3. Draw Output Nodes
        for (let j = 0; j < outputs.length; j++) {
            const x = Visualizer.#getNodeX(outputs, j, left, right);
            const y = top;
            const isActive = outputs[j] === 1;

            ctx.beginPath();
            ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? '#39ff14' : '#141d2f';
            ctx.shadowColor = isActive ? '#39ff14' : 'transparent';
            ctx.shadowBlur = isActive ? 14 : 0;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = isActive ? '#ffffff' : '#415270';
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Output action label
            if (outputLabels && outputLabels[j]) {
                ctx.save();
                ctx.fillStyle = isActive ? '#39ff14' : '#7b8da6';
                ctx.font = 'bold 9px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(outputLabels[j], x, top - 18);
                ctx.restore();
            }
        }
    }

    static #getNodeX(nodes, index, left, right) {
        return Visualizer.lerp(
            left,
            right,
            nodes.length === 1 ? 0.5 : index / (nodes.length - 1)
        );
    }

    static lerp(A, B, t) {
        return A + (B - A) * t;
    }
}
