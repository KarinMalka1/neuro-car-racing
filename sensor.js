/**
 * Ray-Casting Sensors
 * Casts 5 rays outward from the front of the car to measure distance to boundaries.
 */

class Sensor {
    constructor(car) {
        this.car = car;
        this.rayCount = 5;
        this.rayLength = 170;
        this.raySpread = Math.PI * 0.6; // ~108 degrees arc

        this.rays = [];
        this.readings = [];
    }

    /**
     * Update ray positions and calculate intersections with borders.
     * @param {Array<[{x:number, y:number},{x:number, y:number}]>} trackBorders
     */
    update(trackBorders) {
        this.#castRays();
        this.readings = [];

        for (let i = 0; i < this.rays.length; i++) {
            this.readings.push(this.#getReading(this.rays[i], trackBorders));
        }
    }

    /**
     * Compute ray endpoints based on car's position and orientation.
     */
    #castRays() {
        this.rays = [];
        // Calculate the front center of the car
        const forwardOffset = this.car.height * 0.45;
        const startX = this.car.x - Math.sin(this.car.angle) * forwardOffset;
        const startY = this.car.y - Math.cos(this.car.angle) * forwardOffset;

        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = Sensor.lerp(
                this.raySpread / 2,
                -this.raySpread / 2,
                this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1)
            ) + this.car.angle;

            const start = { x: startX, y: startY };
            const end = {
                x: startX - Math.sin(rayAngle) * this.rayLength,
                y: startY - Math.cos(rayAngle) * this.rayLength
            };

            this.rays.push([start, end]);
        }
    }

    /**
     * Find closest intersection for a ray against all track border segments.
     */
    #getReading(ray, trackBorders) {
        const touches = [];

        for (let i = 0; i < trackBorders.length; i++) {
            const touch = Sensor.getIntersection(
                ray[0],
                ray[1],
                trackBorders[i][0],
                trackBorders[i][1]
            );
            if (touch) {
                touches.push(touch);
            }
        }

        if (touches.length === 0) {
            return null;
        }

        // Return the closest intersection
        const offsets = touches.map(e => e.offset);
        const minOffset = Math.min(...offsets);
        return touches.find(e => e.offset === minOffset);
    }

    /**
     * Draw rays on canvas. Only called for the best car.
     */
    draw(ctx) {
        for (let i = 0; i < this.rayCount; i++) {
            const ray = this.rays[i];
            let end = ray[1];
            if (this.readings[i]) {
                end = this.readings[i];
            }

            // Ray beam from car to intersection (or max length)
            ctx.beginPath();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = this.readings[i] ? '#00f3ff' : '#00ffff44';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = this.readings[i] ? 8 : 2;
            ctx.moveTo(ray[0].x, ray[0].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Dim ray segment extending past intersection
            if (this.readings[i]) {
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 60, 90, 0.4)';
                ctx.shadowBlur = 0;
                ctx.moveTo(end.x, end.y);
                ctx.lineTo(ray[1].x, ray[1].y);
                ctx.stroke();

                // Glowing warning contact point
                ctx.beginPath();
                ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0055';
                ctx.shadowColor = '#ff0055';
                ctx.shadowBlur = 10;
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
    }

    /**
     * Line-segment intersection test.
     */
    static getIntersection(A, B, C, D) {
        const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
        const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
        const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

        if (bottom !== 0) {
            const t = tTop / bottom;
            const u = uTop / bottom;
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return {
                    x: Sensor.lerp(A.x, B.x, t),
                    y: Sensor.lerp(A.y, B.y, t),
                    offset: t
                };
            }
        }

        return null;
    }

    static lerp(A, B, t) {
        return A + (B - A) * t;
    }
}
