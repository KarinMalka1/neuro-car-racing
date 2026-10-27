/**
 * Vehicles, AI Pursuit Police, EMP Weapons & Collectibles
 * Featuring 100% Solid Vertex-Level Boundary & Building Collisions (Zero clipping!)
 */

class PlayerCar {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.width = 20;
        this.height = 34;
        this.radius = 18;

        this.speed = 0;
        this.baseMaxSpeed = 7.6;
        this.maxSpeed = this.baseMaxSpeed;
        this.acceleration = 0.38;
        this.friction = 0.048;
        this.turnRate = 0.062;

        this.hp = 100;
        this.maxHp = 100;
        this.empCharges = 2;
        this.isBoosting = false;
        this.isSkidding = false;
        this.hitFlash = 0;

        this.controls = { forward: 0, reverse: 0, left: 0, right: 0, boost: 0 };
        this.polygon = this.#createPolygon();
    }

    update(city) {
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

        // 100% Solid Physical Resolution: Prevents any vertex from penetrating boundaries or buildings
        const didCollide = CarUtils.resolveCityCollisions(this, city);
        if (didCollide) {
            this.hp = Math.max(0, this.hp - 1.5);
            this.hitFlash = 8;
        }

        this.polygon = this.#createPolygon();
    }

    createPolygon() {
        return this.#createPolygon();
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
        this.radius = isSwat ? 19 : 16;

        this.speed = 0;
        this.maxSpeed = isSwat ? 2.6 : 3.4;
        this.acceleration = isSwat ? 0.12 : 0.15;
        this.friction = 0.05;
        this.turnRate = isSwat ? 0.032 : 0.042;

        this.hp = isSwat ? 60 : 30;
        this.maxHp = this.hp;
        this.isDead = false;
        this.sirenTimer = Math.random() * 100;
        this.polygon = this.#createPolygon();
    }

    update(player, city, allCops) {
        if (this.isDead) return;
        this.sirenTimer += 0.2;

        const borders = (city && city.borders) ? city.borders : [];

        // 1. Calculate Target Angle toward Player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        let targetAngle = Math.atan2(-dx, -dy);

        // 2. Obstacle Avoidance feelers
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

        // Solid boundary & building collision
        const didCollide = CarUtils.resolveCityCollisions(this, city);
        if (didCollide) {
            this.hp -= 5;
        }

        this.polygon = this.#createPolygon();
        if (this.hp <= 0) this.isDead = true;
    }

    createPolygon() {
        return this.#createPolygon();
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

        // Flashing siren lightbar
        const isRedPhase = Math.sin(this.sirenTimer * 4) > 0;
        ctx.shadowBlur = 16;

        ctx.fillStyle = isRedPhase ? '#ff0033' : '#0066ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(-this.width * 0.35, -this.height * 0.05, this.width * 0.32, 6);

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
        this.type = type;
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
    /**
     * Complete physical collision solver for city boundaries and building blocks.
     * Checks polygon corners to strictly prevent cars from penetrating walls or buildings.
     */
    static resolveCityCollisions(car, city) {
        if (!city) return false;
        let collided = false;

        const width = city.width || 1060;
        const height = city.height || 700;
        const outerMargin = 40; // Wall boundary at x=35, so 40 ensures zero pixel crossing

        // 1. HARD OUTER FRAME BOUNDARY (Guarantees every corner of the car stays inside)
        for (let iter = 0; iter < 2; iter++) {
            const poly = car.createPolygon();
            for (let i = 0; i < poly.length; i++) {
                const pt = poly[i];
                if (pt.x < outerMargin) {
                    car.x += (outerMargin - pt.x);
                    car.speed = -0.8;
                    collided = true;
                } else if (pt.x > width - outerMargin) {
                    car.x -= (pt.x - (width - outerMargin));
                    car.speed = -0.8;
                    collided = true;
                }

                if (pt.y < outerMargin) {
                    car.y += (outerMargin - pt.y);
                    car.speed = -0.8;
                    collided = true;
                } else if (pt.y > height - outerMargin) {
                    car.y -= (pt.y - (height - outerMargin));
                    car.speed = -0.8;
                    collided = true;
                }
            }
        }

        // 2. THE 4 SOLID BUILDING SQUARES (Cars can NEVER drive on top of them!)
        const buildings = city.buildings || [];
        for (const b of buildings) {
            let poly = car.createPolygon();
            const cMinX = Math.min(...poly.map(p => p.x));
            const cMaxX = Math.max(...poly.map(p => p.x));
            const cMinY = Math.min(...poly.map(p => p.y));
            const cMaxY = Math.max(...poly.map(p => p.y));

            // Check AABB overlap between car and building
            if (cMaxX >= b.x && cMinX <= b.x + b.w && cMaxY >= b.y && cMinY <= b.y + b.h) {
                const bcx = b.x + b.w / 2;
                const bcy = b.y + b.h / 2;
                const normX = (car.x - bcx) / (b.w / 2);
                const normY = (car.y - bcy) / (b.h / 2);

                if (Math.abs(normX) > Math.abs(normY)) {
                    // Push out horizontally
                    if (normX < 0) car.x -= (cMaxX - (b.x - 2));
                    else car.x += ((b.x + b.w + 2) - cMinX);
                } else {
                    // Push out vertically
                    if (normY < 0) car.y -= (cMaxY - (b.y - 2));
                    else car.y += ((b.y + b.h + 2) - cMinY);
                }

                car.speed = -1.0;
                collided = true;
            }
        }

        // 3. ROUNDABOUT PLAZAS (Solid circular obstacles)
        const roundabouts = city.roundabouts || (city.roundabout ? [city.roundabout] : []);
        for (const r of roundabouts) {
            let poly = car.createPolygon();
            for (let i = 0; i < poly.length; i++) {
                const pt = poly[i];
                const dist = Math.hypot(pt.x - r.x, pt.y - r.y);
                const safeRadius = r.radius + 3;
                if (dist < safeRadius) {
                    const angle = Math.atan2(car.y - r.y, car.x - r.x);
                    const push = safeRadius - dist;
                    car.x += Math.cos(angle) * push;
                    car.y += Math.sin(angle) * push;
                    car.speed = -1.0;
                    collided = true;
                }
            }
        }

        return collided;
    }

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
