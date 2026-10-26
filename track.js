/**
 * Racetrack Geometry, Boundaries, Checkpoints, and Rendering
 */

class Track {
    constructor() {
        this.halfWidth = 38; // Track half-width in pixels

        // Base control waypoints for the racing circuit (counter-clockwise)
        this.baseWaypoints = [
            { x: 450, y: 640 }, // Start / Finish line
            { x: 280, y: 640 }, // Front straight
            { x: 150, y: 580 }, // Turn 1 (bottom-left)
            { x: 120, y: 440 }, // West straight
            { x: 130, y: 260 },
            { x: 200, y: 150 }, // Turn 2 (top-left sweep)
            { x: 340, y: 110 },
            { x: 480, y: 140 }, // Gentle bend
            { x: 570, y: 240 }, // Chicane entrance
            { x: 670, y: 240 }, // Chicane exit
            { x: 750, y: 130 },
            { x: 890, y: 130 }, // North-east turn
            { x: 980, y: 240 }, // East loop
            { x: 980, y: 420 },
            { x: 900, y: 560 }, // Hairpin entrance
            { x: 790, y: 580 }, // Hairpin apex
            { x: 720, y: 460 }, // Hairpin exit
            { x: 600, y: 450 }, // Infield straight
            { x: 520, y: 550 }  // Final corner onto main straight
        ];

        this.centerPoints = [];
        this.innerBorder = [];
        this.outerBorder = [];
        this.borders = [];      // Array of segments [[p1, p2], ...] for collision
        this.checkpoints = [];  // Array of segments [[inner, outer], ...]
        this.start = null;

        this.#generateTrack();
    }

    /**
     * Smooth base waypoints with Catmull-Rom spline and generate boundaries & checkpoints.
     */
    #generateTrack() {
        const samplesPerSegment = 5;
        const pts = this.baseWaypoints;
        const n = pts.length;

        // Sample closed Catmull-Rom spline
        this.centerPoints = [];
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const p3 = pts[(i + 2) % n];

            for (let s = 0; s < samplesPerSegment; s++) {
                const t = s / samplesPerSegment;
                const point = Track.catmullRom(p0, p1, p2, p3, t);
                this.centerPoints.push(point);
            }
        }

        const total = this.centerPoints.length;
        this.innerBorder = [];
        this.outerBorder = [];
        this.checkpoints = [];

        for (let i = 0; i < total; i++) {
            const curr = this.centerPoints[i];
            const prev = this.centerPoints[(i - 1 + total) % total];
            const next = this.centerPoints[(i + 1) % total];

            // Tangent direction
            const tx = next.x - prev.x;
            const ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len; // Normal vector
            const ny = tx / len;

            const pInner = {
                x: curr.x + nx * this.halfWidth,
                y: curr.y + ny * this.halfWidth
            };
            const pOuter = {
                x: curr.x - nx * this.halfWidth,
                y: curr.y - ny * this.halfWidth
            };

            this.innerBorder.push(pInner);
            this.outerBorder.push(pOuter);

            // Checkpoint gate crossing perpendicular to track
            this.checkpoints.push([pInner, pOuter]);
        }

        // Generate line segments for collision detection
        this.borders = [];
        for (let i = 0; i < total; i++) {
            const nextIdx = (i + 1) % total;
            this.borders.push([this.innerBorder[i], this.innerBorder[nextIdx]]);
            this.borders.push([this.outerBorder[i], this.outerBorder[nextIdx]]);
        }

        // Set start line & car spawn position
        const startP1 = this.centerPoints[0];
        const startP2 = this.centerPoints[1];
        const startTx = startP2.x - startP1.x;
        const startTy = startP2.y - startP1.y;
        const startAngle = Math.atan2(-startTx, -startTy);

        this.start = {
            x: startP1.x,
            y: startP1.y,
            angle: startAngle
        };
    }

    /**
     * Render track surface, neon glowing borders, checkered line, and curbs.
     */
    draw(ctx) {
        const total = this.centerPoints.length;
        if (total === 0) return;

        // 1. Draw track asphalt surface
        ctx.save();
        ctx.beginPath();
        // Outer loop
        ctx.moveTo(this.outerBorder[0].x, this.outerBorder[0].y);
        for (let i = 1; i < total; i++) {
            ctx.lineTo(this.outerBorder[i].x, this.outerBorder[i].y);
        }
        ctx.closePath();

        // Inner loop (counter-winding to cut out infield)
        for (let i = total - 1; i >= 0; i--) {
            if (i === total - 1) {
                ctx.moveTo(this.innerBorder[i].x, this.innerBorder[i].y);
            } else {
                ctx.lineTo(this.innerBorder[i].x, this.innerBorder[i].y);
            }
        }
        ctx.closePath();

        // Asphalt fill
        ctx.fillStyle = '#111726';
        ctx.fill('evenodd');

        // Track centerline dashed guide
        ctx.beginPath();
        ctx.setLineDash([8, 12]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.moveTo(this.centerPoints[0].x, this.centerPoints[0].y);
        for (let i = 1; i < total; i++) {
            ctx.lineTo(this.centerPoints[i].x, this.centerPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // 2. Curbs on turns (striped alternating neon cyan / pink)
        for (let i = 0; i < total; i += 2) {
            const nextIdx = (i + 1) % total;
            const isAlt = (Math.floor(i / 2) % 2 === 0);

            // Outer curb
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = isAlt ? '#ff007f' : '#00f3ff';
            ctx.moveTo(this.outerBorder[i].x, this.outerBorder[i].y);
            ctx.lineTo(this.outerBorder[nextIdx].x, this.outerBorder[nextIdx].y);
            ctx.stroke();

            // Inner curb
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = isAlt ? '#00f3ff' : '#ff007f';
            ctx.moveTo(this.innerBorder[i].x, this.innerBorder[i].y);
            ctx.lineTo(this.innerBorder[nextIdx].x, this.innerBorder[nextIdx].y);
            ctx.stroke();
        }

        // 3. Glowing Outer Boundary Barrier
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.moveTo(this.outerBorder[0].x, this.outerBorder[0].y);
        for (let i = 1; i < total; i++) {
            ctx.lineTo(this.outerBorder[i].x, this.outerBorder[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // 4. Glowing Inner Boundary Barrier
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 10;
        ctx.moveTo(this.innerBorder[0].x, this.innerBorder[0].y);
        for (let i = 1; i < total; i++) {
            ctx.lineTo(this.innerBorder[i].x, this.innerBorder[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Reset shadows
        ctx.shadowBlur = 0;

        // 5. Checkered Start / Finish Line
        const startGate = this.checkpoints[0];
        const steps = 8;
        for (let s = 0; s < steps; s++) {
            const t1 = s / steps;
            const t2 = (s + 1) / steps;
            const x1 = startGate[0].x + (startGate[1].x - startGate[0].x) * t1;
            const y1 = startGate[0].y + (startGate[1].y - startGate[0].y) * t1;
            const x2 = startGate[0].x + (startGate[1].x - startGate[0].x) * t2;
            const y2 = startGate[0].y + (startGate[1].y - startGate[0].y) * t2;

            ctx.beginPath();
            ctx.lineWidth = 6;
            ctx.strokeStyle = s % 2 === 0 ? '#ffffff' : '#111726';
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Standard Catmull-Rom cubic interpolation.
     */
    static catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;

        const v0 = (p2.x - p0.x) * 0.5;
        const v1 = (p3.x - p1.x) * 0.5;
        const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 +
                  (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 +
                  v0 * t + p1.x;

        const u0 = (p2.y - p0.y) * 0.5;
        const u1 = (p3.y - p1.y) * 0.5;
        const y = (2 * p1.y - 2 * p2.y + u0 + u1) * t3 +
                  (-3 * p1.y + 3 * p2.y - 2 * u0 - u1) * t2 +
                  u0 * t + p1.y;

        return { x, y };
    }
}
