/**
 * 2D Car Kinematics, Collision Polygon, Drift Mechanics & Race Progress
 * Cars NEVER die on wall bumps — they bounce off and keep racing until a winner finishes the lap!
 */

class Car {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} angle
     * @param {NeuralNetwork} brain
     * @param {string} controlType - 'AI', 'PLAYER1', or 'PLAYER2'
     */
    constructor(x, y, angle = 0, brain = null, controlType = 'AI') {
        this.startX = x;
        this.startY = y;
        this.startAngle = angle;

        this.x = x;
        this.y = y;
        this.angle = angle;
        this.controlType = controlType;

        this.width = 18;
        this.height = 32;

        this.speed = 0;
        const isHuman = (controlType === 'PLAYER1' || controlType === 'PLAYER2' || controlType === 'HUMAN');
        this.acceleration = isHuman ? 0.28 : 0.24;
        this.baseMaxSpeed = isHuman ? 5.6 : 5.0;
        this.maxSpeed = this.baseMaxSpeed;
        this.friction = 0.055;
        this.turnRate = isHuman ? 0.056 : 0.050;

        this.isBoosting = false;
        this.isSkidding = false;
        this.hitWallFlash = 0;
        this.isWinner = false;

        // Sensors and Brain
        this.sensor = new Sensor(this);
        this.brain = brain || new NeuralNetwork([5, 6, 4]);

        this.controls = {
            forward: 0,
            reverse: 0,
            left: 0,
            right: 0,
            boost: 0
        };

        // Lap & Race Progress
        this.checkpointsPassed = 0;
        this.nextCheckpointIdx = 1;
        this.laps = 0;
        this.lapFrames = 0;
        this.finalTimeSeconds = null;

        // Bounding polygon
        this.polygon = this.#createPolygon();
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.angle = this.startAngle;
        this.speed = 0;
        this.checkpointsPassed = 0;
        this.nextCheckpointIdx = 1;
        this.laps = 0;
        this.lapFrames = 0;
        this.finalTimeSeconds = null;
        this.isWinner = false;
        this.hitWallFlash = 0;
        this.polygon = this.#createPolygon();
    }

    /**
     * Update car physics, sensor inputs, wall bouncing, and lap checking.
     */
    update(trackBorders, checkpoints) {
        if (this.isWinner) {
            // Decelerate smoothly after winning
            this.speed *= 0.95;
            this.#move();
            this.polygon = this.#createPolygon();
            return;
        }

        this.lapFrames++;
        if (this.hitWallFlash > 0) {
            this.hitWallFlash--;
        }

        // 1. Determine controls (AI or Human)
        if (this.controlType === 'AI') {
            this.sensor.update(trackBorders);
            const inputs = this.sensor.readings.map(s => (s === null ? 0 : 1 - s.offset));
            const outputs = NeuralNetwork.feedForward(inputs, this.brain);
            this.controls.forward = outputs[0];
            this.controls.reverse = outputs[1];
            this.controls.left = outputs[2];
            this.controls.right = outputs[3];
        }

        // 2. Nitro Boost logic
        this.isBoosting = Boolean(this.controls.boost);
        this.maxSpeed = this.isBoosting ? this.baseMaxSpeed * 1.35 : this.baseMaxSpeed;
        if (this.isBoosting && this.controls.forward) {
            this.speed += this.acceleration * 1.4;
        }

        // 3. Movement
        this.#move();

        // 4. Polygon collision testing
        this.polygon = this.#createPolygon();

        // 5. Wall Collision — Bounce off and keep driving! (Never dies!)
        if (this.#assessDamage(trackBorders)) {
            this.speed = -1.4; // Bounce backward
            this.hitWallFlash = 12;
            // Push car away from wall toward track center
            this.x += Math.sin(this.angle) * 4;
            this.y += Math.cos(this.angle) * 4;
            this.polygon = this.#createPolygon();
        }

        // 6. Checkpoint & Lap Progress
        this.#updateCheckpoints(checkpoints);
    }

    #move() {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration * 0.6;
        }

        // Clamp speed
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        // Friction
        if (this.speed > 0) {
            this.speed -= this.friction;
            if (this.speed < 0) this.speed = 0;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
            if (this.speed > 0) this.speed = 0;
        }

        // Steering & Skid
        this.isSkidding = false;
        if (Math.abs(this.speed) > 0.1) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += this.turnRate * flip;
                if (Math.abs(this.speed) > 3.4) this.isSkidding = true;
            }
            if (this.controls.right) {
                this.angle -= this.turnRate * flip;
                if (Math.abs(this.speed) > 3.4) this.isSkidding = true;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });

        return points;
    }

    #assessDamage(trackBorders) {
        if (!trackBorders) return false;
        for (let i = 0; i < trackBorders.length; i++) {
            if (Car.polysIntersect(this.polygon, trackBorders[i])) {
                return true;
            }
        }
        return false;
    }

    #updateCheckpoints(checkpoints) {
        if (!checkpoints || checkpoints.length === 0) return;

        const nextGate = checkpoints[this.nextCheckpointIdx];
        const gateCenter = {
            x: (nextGate[0].x + nextGate[1].x) / 2,
            y: (nextGate[0].y + nextGate[1].y) / 2
        };

        const dist = Math.hypot(this.x - gateCenter.x, this.y - gateCenter.y);
        const didCross = Sensor.getIntersection(
            { x: this.x, y: this.y },
            { x: this.x - Math.sin(this.angle) * this.height, y: this.y - Math.cos(this.angle) * this.height },
            nextGate[0],
            nextGate[1]
        );

        if (didCross || dist < 65) {
            this.checkpointsPassed++;
            this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % checkpoints.length;

            // When completing a full circle (crossing back through gate 0 after all checkpoints)
            if (this.nextCheckpointIdx === 0 && this.checkpointsPassed >= checkpoints.length * 0.85) {
                this.laps++;
                this.isWinner = true;
                this.finalTimeSeconds = (this.lapFrames / 60).toFixed(2);
                if (window.onRaceFinished) {
                    window.onRaceFinished(this);
                }
            }
        }
    }

    /**
     * Draw the car polygon with custom styling for each player.
     */
    draw(ctx, isLeadingAI = false) {
        if (!this.polygon || this.polygon.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();

        let carColor = '#00f3ff';
        let glowColor = '#00f3ff';
        let labelText = '';

        if (this.controlType === 'PLAYER1' || this.controlType === 'HUMAN') {
            // Player 1: Fiery Neon Orange
            carColor = this.hitWallFlash > 0 ? '#ff0033' : '#ff5500';
            glowColor = this.isBoosting ? '#00f3ff' : '#ff5500';
            labelText = 'YOU (P1)';
        } else if (this.controlType === 'PLAYER2') {
            // Player 2: Neon Purple / Cyan
            carColor = this.hitWallFlash > 0 ? '#ff0033' : '#a855f7';
            glowColor = this.isBoosting ? '#ffe600' : '#a855f7';
            labelText = 'PLAYER 2';
        } else if (this.controlType === 'AI') {
            // AI Rival / Champion
            carColor = isLeadingAI ? '#39ff14' : 'rgba(0, 243, 255, 0.5)';
            glowColor = isLeadingAI ? '#39ff14' : 'transparent';
            labelText = isLeadingAI ? 'AI RIVAL' : '';
        }

        ctx.fillStyle = carColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.isBoosting || isLeadingAI) ? 20 : 12;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.fill();
        ctx.stroke();

        // Cockpit & Headlights
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);

        // Windshield
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(-this.width * 0.3, -this.height * 0.3, this.width * 0.6, this.height * 0.35);

        // Headlights
        ctx.fillStyle = (this.controlType === 'AI' ? '#00f3ff' : '#ffe600');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillRect(-this.width * 0.38, -this.height * 0.48, 4, 3);
        ctx.fillRect(this.width * 0.38 - 4, -this.height * 0.48, 4, 3);

        // Floating Player Label
        if (labelText) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#000000';
            ctx.fillText(labelText, 0, this.height * 0.75);
        }

        // Nitro Boost Jet Flames
        if (this.isBoosting) {
            ctx.fillStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(-4, this.height * 0.5);
            ctx.lineTo(0, this.height * 0.5 + 18 + Math.random() * 8);
            ctx.lineTo(4, this.height * 0.5);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
        ctx.restore();
    }

    static polysIntersect(poly, segment) {
        if (!poly || poly.length < 2 || !segment) return false;
        for (let i = 0; i < poly.length; i++) {
            const touch = Sensor.getIntersection(
                poly[i],
                poly[(i + 1) % poly.length],
                segment[0],
                segment[1]
            );
            if (touch) return true;
        }
        return false;
    }
}
