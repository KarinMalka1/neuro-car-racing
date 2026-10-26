/**
 * 2D Car Kinematics, Collision Polygon, Drift Mechanics & Fitness
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
        this.acceleration = controlType === 'HUMAN' ? 0.26 : 0.22;
        this.baseMaxSpeed = controlType === 'HUMAN' ? 5.4 : 4.8;
        this.maxSpeed = this.baseMaxSpeed;
        this.friction = 0.05;
        this.turnRate = controlType === 'HUMAN' ? 0.054 : 0.048;

        this.isBoosting = false;
        this.isSkidding = false;
        this.damaged = false;
        this.hitWallFlash = 0;

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

        // Genetic fitness & timing
        this.fitness = 0;
        this.checkpointsPassed = 0;
        this.nextCheckpointIdx = 1;
        this.laps = 0;
        this.framesSinceCheckpoint = 0;
        this.stuckFrames = 0;

        // Lap Timing (in seconds)
        this.lapStartFrame = 0;
        this.currentLapFrames = 0;
        this.bestLapSeconds = null;

        // Immediately compute bounding polygon
        this.polygon = this.#createPolygon();
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
            if (this.#assessDamage(trackBorders)) {
                this.damaged = true;
            }

            // 5. Checkpoint progression & fitness
            this.#updateFitness(checkpoints);
        }
    }

    #updateHuman(trackBorders, checkpoints) {
        this.currentLapFrames++;
        if (this.hitWallFlash > 0) {
            this.hitWallFlash--;
        }

        // Nitro Boost toggle
        this.isBoosting = Boolean(this.controls.boost);
        this.maxSpeed = this.isBoosting ? this.baseMaxSpeed * 1.35 : this.baseMaxSpeed;
        if (this.isBoosting && this.controls.forward) {
            this.speed += this.acceleration * 1.5;
        }

        this.#move();
        this.polygon = this.#createPolygon();

        // Check if player bumped into wall
        if (this.#assessDamage(trackBorders)) {
            // Bounce back and slow down smoothly without killing the player
            this.speed = -1.5;
            this.hitWallFlash = 12;
            this.x += Math.sin(this.angle) * 3.5;
            this.y += Math.cos(this.angle) * 3.5;
            this.polygon = this.#createPolygon();
        }

        // Lap progression for human player
        if (checkpoints && checkpoints.length > 0) {
            const nextGate = checkpoints[this.nextCheckpointIdx];
            const gateCenter = {
                x: (nextGate[0].x + nextGate[1].x) / 2,
                y: (nextGate[0].y + nextGate[1].y) / 2
            };
            const dist = Math.hypot(this.x - gateCenter.x, this.y - gateCenter.y);
            if (dist < 60) {
                this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % checkpoints.length;
                if (this.nextCheckpointIdx === 0) {
                    this.laps++;
                    const lapSec = (this.currentLapFrames / 60).toFixed(2);
                    if (!this.bestLapSeconds || parseFloat(lapSec) < parseFloat(this.bestLapSeconds)) {
                        this.bestLapSeconds = lapSec;
                    }
                    this.currentLapFrames = 0;
                    if (window.triggerCelebration) {
                        window.triggerCelebration(lapSec);
                    }
                }
            }
        }
    }

    #move() {
        // Forward / Reverse acceleration
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration * 0.6;
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

        // Steering & Drift detection
        this.isSkidding = false;
        if (Math.abs(this.speed) > 0.1) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += this.turnRate * flip;
                if (Math.abs(this.speed) > 3.2) this.isSkidding = true;
            }
            if (this.controls.right) {
                this.angle -= this.turnRate * flip;
                if (Math.abs(this.speed) > 3.2) this.isSkidding = true;
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
        if (!trackBorders) return false;
        for (let i = 0; i < trackBorders.length; i++) {
            if (Car.polysIntersect(this.polygon, trackBorders[i])) {
                return true;
            }
        }
        return false;
    }

    #updateFitness(checkpoints) {
        this.framesSinceCheckpoint++;

        // Auto-cull cars that are dead stopped
        if (Math.abs(this.speed) < 0.2) {
            this.stuckFrames++;
            if (this.stuckFrames > 200) {
                this.damaged = true;
                return;
            }
        } else {
            this.stuckFrames = 0;
        }

        // Generous checkpoint timeout: 10 seconds to reach next gate
        if (this.framesSinceCheckpoint > 600) {
            this.damaged = true;
            return;
        }

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

        if (didCross || dist < 55) {
            this.checkpointsPassed++;
            this.framesSinceCheckpoint = 0;
            this.nextCheckpointIdx = (this.nextCheckpointIdx + 1) % checkpoints.length;

            if (this.nextCheckpointIdx === 0) {
                this.laps++;
            }
        }

        // Fitness calculation
        const maxGateDist = 140;
        const progressToNext = Math.max(0, 1 - dist / maxGateDist);
        this.fitness = (this.checkpointsPassed * 100) + (progressToNext * 60) + (this.laps * 5000);

        if (this.damaged) {
            this.fitness = Math.max(0, this.fitness - 20);
        }
    }

    /**
     * Draw the car polygon with futuristic styling.
     */
    draw(ctx, isBest = false) {
        if (!this.polygon || this.polygon.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();

        if (this.controlType === 'HUMAN') {
            // Player Car: Fiery Orange
            ctx.fillStyle = this.hitWallFlash > 0 ? '#ff0033' : '#ff5500';
            ctx.shadowColor = this.isBoosting ? '#00f3ff' : '#ff5500';
            ctx.shadowBlur = this.isBoosting ? 22 : 14;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();

            // Cockpit
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
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#000000';
            ctx.fillText('YOU (P1)', 0, this.height * 0.75);

            // Nitro Boost Flame Tail
            if (this.isBoosting) {
                ctx.fillStyle = '#00f3ff';
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(-4, this.height * 0.5);
                ctx.lineTo(0, this.height * 0.5 + 16 + Math.random() * 8);
                ctx.lineTo(4, this.height * 0.5);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
            ctx.restore();
            return;
        }

        if (this.damaged) {
            // Crashed car: dim
            ctx.fillStyle = 'rgba(120, 30, 40, 0.08)';
            ctx.strokeStyle = 'rgba(200, 40, 40, 0.12)';
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

            // Windshield
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(-this.angle);
            ctx.fillStyle = '#0a101d';
            ctx.fillRect(-this.width * 0.3, -this.height * 0.3, this.width * 0.6, this.height * 0.35);

            // Headlights
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

    static polysIntersect(poly, segment) {
        if (!poly || poly.length < 2 || !segment) return false;
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
