/**
 * 2D Car Kinematics, Collision Polygon, Neural Controls & Fitness
 */

class Car {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} angle
     * @param {NeuralNetwork} brain
     * @param {string} controlType - 'AI' or 'HUMAN'
     */
    constructor(x, y, angle = 0, brain = null, controlType = 'AI') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.controlType = controlType;

        this.width = 18;
        this.height = 32;

        this.speed = 0;
        this.acceleration = 0.22;
        this.maxSpeed = controlType === 'HUMAN' ? 5.2 : 4.8;
        this.friction = 0.05;
        this.turnRate = 0.05;

        this.damaged = false;
        this.respawnTimer = 0;
        this.polygon = [];

        // Sensors and Brain
        this.sensor = new Sensor(this);
        this.brain = brain || new NeuralNetwork([5, 6, 4]);

        this.controls = {
            forward: 0,
            reverse: 0,
            left: 0,
            right: 0
        };

        // Genetic fitness tracking
        this.fitness = 0;
        this.checkpointsPassed = 0;
        this.nextCheckpointIdx = 1; // Starting line is checkpoint 0
        this.laps = 0;
        this.framesSinceCheckpoint = 0;
        this.stuckFrames = 0;
    }

    /**
     * Update car physics, sensor inputs, neural decisions, collision & fitness.
     */
    update(trackBorders, checkpoints) {
        if (this.controlType === 'HUMAN') {
            this.#updateHuman(trackBorders, checkpoints);
            return;
        }

        if (!this.damaged) {
            // 1. Update sensors & query Neural Network
            this.sensor.update(trackBorders);

            // Normalize inputs: 1 = wall touching bumper, 0 = no wall in range
            const inputs = this.sensor.readings.map(s => (s === null ? 0 : 1 - s.offset));
            const outputs = NeuralNetwork.feedForward(inputs, this.brain);

            this.controls.forward = outputs[0];
            this.controls.reverse = outputs[1];
            this.controls.left = outputs[2];
            this.controls.right = outputs[3];

            // 2. Physics & Kinematics
            this.#move();

            // 3. Compute collision polygon
            this.polygon = this.#createPolygon();

            // 4. Collision test with borders
            this.damaged = this.#assessDamage(trackBorders);

            // 5. Checkpoint progression & fitness
            this.#updateFitness(checkpoints);
        }
    }

    #updateHuman(trackBorders, checkpoints) {
        if (this.respawnTimer > 0) {
            this.respawnTimer--;
            if (this.respawnTimer === 0) {
                // Respawn at start line
                const startGate = checkpoints[0];
                this.x = (startGate[0].x + startGate[1].x) / 2;
                this.y = (startGate[0].y + startGate[1].y) / 2;
                this.speed = 0;
            }
            return;
        }

        this.#move();
        this.polygon = this.#createPolygon();

        // Check crash
        if (this.#assessDamage(trackBorders)) {
            this.respawnTimer = 25; // Brief respawn pause
            this.speed = -1.5; // Bounce back
            return;
        }

        // Lap progression
        const nextGate = checkpoints[this.nextCheckpointIdx];
        const gateCenter = {
            x: (nextGate[0].x + nextGate[1].x) / 2,
            y: (nextGate[0].y + nextGate[1].y) / 2
        };
        const dist = Math.hypot(this.x - gateCenter.x, this.y - gateCenter.y);
        if (dist < 50) {
            this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % checkpoints.length;
            if (this.nextCheckpointIdx === 0) {
                this.laps++;
            }
        }
    }

    #move() {
        // Forward / Reverse acceleration
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration * 0.55;
        }

        // Clamp speed
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }

        // Friction
        if (this.speed > 0) {
            this.speed -= this.friction;
            if (this.speed < 0) this.speed = 0;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
            if (this.speed > 0) this.speed = 0;
        }

        // Steering (only if moving)
        if (Math.abs(this.speed) > 0.05) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += this.turnRate * flip;
            }
            if (this.controls.right) {
                this.angle -= this.turnRate * flip;
            }
        }

        // Apply movement vector
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
        for (let i = 0; i < trackBorders.length; i++) {
            if (Car.polysIntersect(this.polygon, trackBorders[i])) {
                return true;
            }
        }
        return false;
    }

    #updateFitness(checkpoints) {
        this.framesSinceCheckpoint++;

        // Detect if stuck/immobile
        if (Math.abs(this.speed) < 0.25) {
            this.stuckFrames++;
            if (this.stuckFrames > 120) {
                this.damaged = true; // Auto-cull cars that idle or get wedged
                return;
            }
        } else {
            this.stuckFrames = 0;
        }

        // Timeout if car fails to reach next checkpoint in ~3.5 seconds
        if (this.framesSinceCheckpoint > 220) {
            this.damaged = true;
            return;
        }

        const nextGate = checkpoints[this.nextCheckpointIdx];
        const gateCenter = {
            x: (nextGate[0].x + nextGate[1].x) / 2,
            y: (nextGate[0].y + nextGate[1].y) / 2
        };

        // Check if car passed or is close to the next checkpoint
        const dist = Math.hypot(this.x - gateCenter.x, this.y - gateCenter.y);
        const didCross = Sensor.getIntersection(
            { x: this.x, y: this.y },
            { x: this.x - Math.sin(this.angle) * this.height, y: this.y - Math.cos(this.angle) * this.height },
            nextGate[0],
            nextGate[1]
        );

        if (didCross || dist < 45) {
            this.checkpointsPassed++;
            this.framesSinceCheckpoint = 0;
            this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % checkpoints.length;

            if (this.nextCheckpointIdx === 0) {
                this.laps++;
            }
        }

        // Continuous fitness: passed checkpoints + proximity to next gate
        const maxGateDist = 120;
        const progressToNext = Math.max(0, 1 - dist / maxGateDist);
        this.fitness = (this.checkpointsPassed * 100) + (progressToNext * 60) + (this.laps * 5000);

        if (this.damaged) {
            this.fitness = Math.max(0, this.fitness - 30);
        }
    }

    /**
     * Draw the car polygon with futuristic styling.
     */
    draw(ctx, isBest = false) {
        if (this.polygon.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();

        if (this.controlType === 'HUMAN') {
            // Player Car: Fiery Orange with pulsing electric shield
            ctx.fillStyle = '#ff5500';
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 16;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();

            // Headlights & windshield
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(-this.angle);
            ctx.fillStyle = '#111726';
            ctx.fillRect(-this.width * 0.3, -this.height * 0.3, this.width * 0.6, this.height * 0.35);

            // Bright amber headlights
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.fillRect(-this.width * 0.38, -this.height * 0.48, 4, 3);
            ctx.fillRect(this.width * 0.38 - 4, -this.height * 0.48, 4, 3);

            // Floating "YOU" tag
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#000000';
            ctx.fillText('YOU (P1)', 0, this.height * 0.75);
            ctx.restore();
            ctx.restore();
            return;
        }

        if (this.damaged) {
            // Crashed car: dim and unobtrusive
            ctx.fillStyle = 'rgba(120, 30, 40, 0.12)';
            ctx.strokeStyle = 'rgba(200, 40, 40, 0.2)';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
        } else if (isBest) {
            // Champion car: neon green & yellow with electric glow
            ctx.fillStyle = '#39ff14';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 14;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();

            // Sleek windshield / cockpit
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(-this.angle);
            ctx.fillStyle = '#0a101d';
            ctx.fillRect(-this.width * 0.3, -this.height * 0.3, this.width * 0.6, this.height * 0.35);

            // Glowing headlights
            ctx.fillStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 8;
            ctx.fillRect(-this.width * 0.38, -this.height * 0.48, 4, 3);
            ctx.fillRect(this.width * 0.38 - 4, -this.height * 0.48, 4, 3);
            ctx.restore();
        } else {
            // Normal active population: semi-transparent neon cyan
            ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Test intersection between a polygon (array of vertices) and a line segment.
     */
    static polysIntersect(poly, segment) {
        for (let i = 0; i < poly.length; i++) {
            const touch = Sensor.getIntersection(
                poly[i],
                poly[(i + 1) % poly.length],
                segment[0],
                segment[1]
            );
            if (touch) {
                return true;
            }
        }
        return false;
    }
}
