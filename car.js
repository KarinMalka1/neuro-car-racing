/**
 * Vehicles, AI Pursuit Police, EMP Weapons & Collectibles
 */

class PlayerCar {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.width = 20;
        this.height = 34;

        this.speed = 0;
        this.baseMaxSpeed = 5.8;
        this.maxSpeed = this.baseMaxSpeed;
        this.acceleration = 0.28;
        this.friction = 0.052;
        this.turnRate = 0.056;

        this.hp = 100;
        this.maxHp = 100;
        this.empCharges = 2;
        this.isBoosting = false;
        this.isSkidding = false;
        this.hitFlash = 0;

        this.controls = { forward: 0, reverse: 0, left: 0, right: 0, boost: 0 };
        this.polygon = this.#createPolygon();
    }

    update(borders) {
        if (this.hitFlash > 0) this.hitFlash--;

        // Nitro Boost
        this.isBoosting = Boolean(this.controls.boost);
        this.maxSpeed = this.isBoosting ? this.baseMaxSpeed * 1.35 : this.baseMaxSpeed;
        if (this.isBoosting && this.controls.forward) {
            this.speed += this.acceleration * 1.3;
        }

        // Movement Kinematics
        if (this.controls.forward) this.speed += this.acceleration;
        if (this.controls.reverse) this.speed -= this.acceleration * 0.6;

        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        if (this.speed > 0) {
            this.speed -= this.friction;
            if (this.speed < 0) this.speed = 0;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
            if (this.speed > 0) this.speed = 0;
        }

        // Steering & Drift
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
        this.polygon = this.#createPolygon();

        // Wall collisions
        for (let i = 0; i < borders.length; i++) {
            if (CarUtils.polysIntersect(this.polygon, borders[i])) {
                this.speed = -1.5;
                this.hp = Math.max(0, this.hp - 3);
                this.hitFlash = 8;
                this.x += Math.sin(this.angle) * 4;
                this.y += Math.cos(this.angle) * 4;
                this.polygon = this.#createPolygon();
                break;
            }
        }
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({ x: this.x - Math.sin(this.angle - alpha) * rad, y: this.y - Math.cos(this.angle - alpha) * rad });
        points.push({ x: this.x - Math.sin(this.angle + alpha) * rad, y: this.y - Math.cos(this.angle + alpha) * rad });
        points.push({ x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad, y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad });
        points.push({ x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad, y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad });
        return points;
    }

    draw(ctx) {
        if (!this.polygon || this.polygon.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        ctx.closePath();

        // Fiery Orange Body
        ctx.fillStyle = this.hitFlash > 0 ? '#ff0033' : '#ff5500';
        ctx.shadowColor = this.isBoosting ? '#00f3ff' : '#ff5500';
        ctx.shadowBlur = this.isBoosting ? 22 : 14;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
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
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 10;
        ctx.fillRect(-this.width * 0.38, -this.height * 0.48, 4, 3);
        ctx.fillRect(this.width * 0.38 - 4, -this.height * 0.48, 4, 3);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.fillText('YOU', 0, this.height * 0.72);

        // Nitro Jet Flame
        if (this.isBoosting) {
            ctx.fillStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(-4, this.height * 0.5);
            ctx.lineTo(0, this.height * 0.5 + 20 + Math.random() * 8);
            ctx.lineTo(4, this.height * 0.5);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
        ctx.restore();
    }
}

class CopCar {
    constructor(x, y, isSwat = false) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.isSwat = isSwat;

        this.width = isSwat ? 24 : 19;
        this.height = isSwat ? 38 : 32;

        this.speed = 0;
        this.maxSpeed = isSwat ? 4.2 : 5.1;
        this.acceleration = isSwat ? 0.18 : 0.22;
        this.friction = 0.05;
        this.turnRate = isSwat ? 0.038 : 0.048;

        this.hp = isSwat ? 60 : 30;
        this.maxHp = this.hp;
        this.isDead = false;
        this.sirenTimer = Math.random() * 100;
        this.polygon = this.#createPolygon();
    }

    update(player, borders, allCops) {
        if (this.isDead) return;
        this.sirenTimer += 0.2;

        // 1. Calculate Target Angle toward Player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        let targetAngle = Math.atan2(-dx, -dy);

        // 2. Obstacle Avoidance (Raycast 3 feelers in front)
        const feelerLength = 70;
        const feelers = [
            { x: this.x - Math.sin(this.angle) * feelerLength, y: this.y - Math.cos(this.angle) * feelerLength },
            { x: this.x - Math.sin(this.angle - 0.5) * feelerLength, y: this.y - Math.cos(this.angle - 0.5) * feelerLength },
            { x: this.x - Math.sin(this.angle + 0.5) * feelerLength, y: this.y - Math.cos(this.angle + 0.5) * feelerLength }
        ];

        let steerAway = 0;
        for (const b of borders) {
            if (SensorUtils.getIntersection({ x: this.x, y: this.y }, feelers[1], b[0], b[1])) steerAway += 0.8;
            if (SensorUtils.getIntersection({ x: this.x, y: this.y }, feelers[2], b[0], b[1])) steerAway -= 0.8;
        }

        // Steer toward target with wall avoidance
        let angleDiff = targetAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (steerAway !== 0) {
            this.angle += steerAway * 0.05;
        } else {
            this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);
        }

        // Accelerate
        this.speed += this.acceleration;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
        this.polygon = this.#createPolygon();

        // Wall Collision
        for (let i = 0; i < borders.length; i++) {
            if (CarUtils.polysIntersect(this.polygon, borders[i])) {
                this.speed = -1.2;
                this.hp -= 8;
                this.x += Math.sin(this.angle) * 4;
                this.y += Math.cos(this.angle) * 4;
                this.polygon = this.#createPolygon();
                break;
            }
        }

        if (this.hp <= 0) this.isDead = true;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({ x: this.x - Math.sin(this.angle - alpha) * rad, y: this.y - Math.cos(this.angle - alpha) * rad });
        points.push({ x: this.x - Math.sin(this.angle + alpha) * rad, y: this.y - Math.cos(this.angle + alpha) * rad });
        points.push({ x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad, y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad });
        points.push({ x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad, y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad });
        return points;
    }

    draw(ctx) {
        if (this.isDead || !this.polygon || this.polygon.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        ctx.closePath();

        // Police Body: Sleek Midnight Black & White
        ctx.fillStyle = this.isSwat ? '#1e293b' : '#0f172a';
        ctx.strokeStyle = this.isSwat ? '#64748b' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);

        // White Door Panels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width * 0.48, -this.height * 0.1, this.width * 0.96, this.height * 0.2);

        // Windshield
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-this.width * 0.35, -this.height * 0.35, this.width * 0.7, this.height * 0.22);

        // FLASHING POLICE SIREN LIGHTBAR (Red & Blue flashing)
        const isRedPhase = Math.sin(this.sirenTimer * 4) > 0;
        ctx.shadowBlur = 16;

        // Left Lamp
        ctx.fillStyle = isRedPhase ? '#ff0033' : '#0066ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(-this.width * 0.35, -this.height * 0.05, this.width * 0.32, 6);

        // Right Lamp
        ctx.fillStyle = isRedPhase ? '#0066ff' : '#ff0033';
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(this.width * 0.03, -this.height * 0.05, this.width * 0.32, 6);

        // Front Headlights
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-this.width * 0.38, -this.height * 0.48, 4, 3);
        ctx.fillRect(this.width * 0.38 - 4, -this.height * 0.48, 4, 3);

        ctx.restore();
        ctx.restore();
    }
}

class Collectible {
    constructor(x, y, type = 'CASH') {
        this.x = x;
        this.y = y;
        this.type = type; // 'CASH', 'WRENCH', 'EMP'
        this.radius = 16;
        this.pulse = 0;
    }

    draw(ctx) {
        this.pulse += 0.05;
        const glowRad = this.radius + Math.sin(this.pulse) * 3;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRad, 0, Math.PI * 2);

        let icon = '💰';
        let glowColor = '#ffe600';
        if (this.type === 'WRENCH') {
            icon = '🔧';
            glowColor = '#39ff14';
        } else if (this.type === 'EMP') {
            icon = '⚡';
            glowColor = '#00f3ff';
        }

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '16px "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, this.x, this.y);
        ctx.restore();
    }
}

class CarUtils {
    static polysIntersect(poly, segment) {
        if (!poly || poly.length < 2 || !segment) return false;
        for (let i = 0; i < poly.length; i++) {
            const touch = SensorUtils.getIntersection(poly[i], poly[(i + 1) % poly.length], segment[0], segment[1]);
            if (touch) return true;
        }
        return false;
    }
}

class SensorUtils {
    static getIntersection(A, B, C, D) {
        const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
        const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
        const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

        if (bottom !== 0) {
            const t = tTop / bottom;
            const u = uTop / bottom;
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, offset: t };
            }
        }
        return null;
    }
}
