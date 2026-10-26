/**
 * City Grid Arena: Streets, Neon Buildings, Obstacles & Wall Collision Segments
 */

class CityArena {
    constructor(width = 1060, height = 700) {
        this.width = width;
        this.height = height;

        // Outer boundary walls (margin 35px)
        const m = 35;
        this.outerBounds = [
            [{ x: m, y: m }, { x: width - m, y: m }],
            [{ x: width - m, y: m }, { x: width - m, y: height - m }],
            [{ x: width - m, y: height - m }, { x: m, y: height - m }],
            [{ x: m, y: height - m }, { x: m, y: m }]
        ];

        // 4 Large City Building Blocks (creating 4-way intersections and avenues)
        this.buildings = [
            // Top-Left Block
            { x: 180, y: 140, w: 230, h: 150, color: '#131c31', border: '#00f3ff' },
            // Top-Right Block
            { x: 650, y: 140, w: 230, h: 150, color: '#131c31', border: '#00f3ff' },
            // Bottom-Left Block
            { x: 180, y: 410, w: 230, h: 150, color: '#131c31', border: '#ff007f' },
            // Bottom-Right Block
            { x: 650, y: 410, w: 230, h: 150, color: '#131c31', border: '#ff007f' }
        ];

        // Central Roundabout Barrier
        this.roundabout = { x: width / 2, y: height / 2, radius: 55 };

        // Generate line segments for collision detection
        this.borders = [];
        this.#generateCollisionBorders();
    }

    #generateCollisionBorders() {
        this.borders = [...this.outerBounds];

        // Add building borders
        for (const b of this.buildings) {
            const p1 = { x: b.x, y: b.y };
            const p2 = { x: b.x + b.w, y: b.y };
            const p3 = { x: b.x + b.w, y: b.y + b.h };
            const p4 = { x: b.x, y: b.y + b.h };

            this.borders.push([p1, p2]);
            this.borders.push([p2, p3]);
            this.borders.push([p3, p4]);
            this.borders.push([p4, p1]);
        }

        // Approximate roundabout circle with 12 segments
        const r = this.roundabout;
        const steps = 12;
        for (let i = 0; i < steps; i++) {
            const a1 = (i / steps) * Math.PI * 2;
            const a2 = ((i + 1) / steps) * Math.PI * 2;
            const p1 = { x: r.x + Math.cos(a1) * r.radius, y: r.y + Math.sin(a1) * r.radius };
            const p2 = { x: r.x + Math.cos(a2) * r.radius, y: r.y + Math.sin(a2) * r.radius };
            this.borders.push([p1, p2]);
        }
    }

    draw(ctx) {
        // 1. Dark Asphalt Ground
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. City Grid & Street Lane Markings
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.lineWidth = 1;

        // Street grid
        const step = 40;
        for (let x = 0; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Center lane road dividers (yellow dashed)
        ctx.setLineDash([12, 16]);
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.25)';
        ctx.lineWidth = 2;

        // Main Cross Avenues
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 40);
        ctx.lineTo(this.width / 2, this.height - 40);
        ctx.moveTo(40, this.height / 2);
        ctx.lineTo(this.width - 40, this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        ctx.restore();

        // 3. Draw Buildings with 3D Hologram Neon Styling
        for (const b of this.buildings) {
            ctx.save();
            // Building Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(b.x + 8, b.y + 8, b.w, b.h);

            // Building Roof
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // Glowing Neon Edge
            ctx.strokeStyle = b.border;
            ctx.shadowColor = b.border;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Roof Vent / Detail
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(b.x + 20, b.y + 20, b.w - 40, b.h - 40);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeRect(b.x + 20, b.y + 20, b.w - 40, b.h - 40);
            ctx.restore();
        }

        // 4. Central Roundabout Plaza
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.roundabout.x, this.roundabout.y, this.roundabout.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#141d2f';
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center fountain neon icon
        ctx.beginPath();
        ctx.arc(this.roundabout.x, this.roundabout.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();

        // 5. Outer Perimeter Neon Boundary
        ctx.save();
        ctx.beginPath();
        const m = 35;
        ctx.rect(m, m, this.width - m * 2, this.height - m * 2);
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}
