/**
 * City Grid Arena: 4 Unique Progressive Stages with Custom Layouts & Cyberpunk Themes
 */

class CityArena {
    constructor(width = 1060, height = 700, stage = 1) {
        this.width = width;
        this.height = height;
        this.stage = stage;

        const m = 35;
        this.outerBounds = [
            [{ x: m, y: m }, { x: width - m, y: m }],
            [{ x: width - m, y: m }, { x: width - m, y: height - m }],
            [{ x: width - m, y: height - m }, { x: m, y: height - m }],
            [{ x: m, y: height - m }, { x: m, y: m }]
        ];

        this.buildings = [];
        this.roundabouts = []; // Can support 1 or multiple circular plazas
        this.theme = this.#getStageTheme(stage);

        this.#generateStageLayout(stage);
        this.borders = [];
        this.#generateCollisionBorders();
    }

    #getStageTheme(stage) {
        switch (stage) {
            case 2:
                return {
                    name: "STAGE 2: INDUSTRIAL DOCKS",
                    primary: "#ffe600",   // Amber Gold
                    secondary: "#39ff14", // Emerald Green
                    gridColor: "rgba(255, 230, 0, 0.08)",
                    borderGlow: "#ffe600"
                };
            case 3:
                return {
                    name: "STAGE 3: NEON ALLEYWAYS",
                    primary: "#a855f7",   // Neon Purple
                    secondary: "#00f3ff", // Electric Cyan
                    gridColor: "rgba(168, 85, 247, 0.08)",
                    borderGlow: "#a855f7"
                };
            case 4:
                return {
                    name: "STAGE 4: MAXIMUM OVERDRIVE",
                    primary: "#ff0055",   // Crimson Red
                    secondary: "#ffffff", // Pure White
                    gridColor: "rgba(255, 0, 85, 0.1)",
                    borderGlow: "#ff0055"
                };
            case 1:
            default:
                return {
                    name: "STAGE 1: DOWNTOWN CYBER GRID",
                    primary: "#00f3ff",   // Electric Cyan
                    secondary: "#ff007f", // Neon Magenta
                    gridColor: "rgba(0, 243, 255, 0.08)",
                    borderGlow: "#00f3ff"
                };
        }
    }

    #generateStageLayout(stage) {
        if (stage === 1) {
            // Stage 1: 4 Corner Blocks + 1 Central Roundabout
            this.buildings = [
                { x: 180, y: 140, w: 230, h: 150, color: '#131c31', border: this.theme.primary },
                { x: 650, y: 140, w: 230, h: 150, color: '#131c31', border: this.theme.primary },
                { x: 180, y: 410, w: 230, h: 150, color: '#131c31', border: this.theme.secondary },
                { x: 650, y: 410, w: 230, h: 150, color: '#131c31', border: this.theme.secondary }
            ];
            this.roundabouts = [{ x: this.width / 2, y: this.height / 2, radius: 55, color: this.theme.primary }];
            this.roundabout = this.roundabouts[0];
        } else if (stage === 2) {
            // Stage 2: Industrial Docks — Long Horizontal Warehouses & Container Stacks
            this.buildings = [
                // Top Long Warehouse
                { x: 200, y: 140, w: 320, h: 110, color: '#1a1f2c', border: this.theme.primary },
                // Bottom Long Warehouse
                { x: 540, y: 450, w: 320, h: 110, color: '#1a1f2c', border: this.theme.primary },
                // Left Shipping Container Stack
                { x: 180, y: 360, w: 140, h: 190, color: '#12201e', border: this.theme.secondary },
                // Right Shipping Container Stack
                { x: 740, y: 150, w: 140, h: 190, color: '#12201e', border: this.theme.secondary }
            ];
            this.roundabouts = [{ x: 530, y: 310, radius: 50, color: this.theme.primary }];
            this.roundabout = this.roundabouts[0];
        } else if (stage === 3) {
            // Stage 3: Neon Alleyways — Chicane Blocks & High-Speed Central Avenues
            this.buildings = [
                { x: 170, y: 130, w: 180, h: 190, color: '#1b1429', border: this.theme.primary },
                { x: 710, y: 130, w: 180, h: 190, color: '#1b1429', border: this.theme.primary },
                { x: 170, y: 380, w: 180, h: 190, color: '#141e2b', border: this.theme.secondary },
                { x: 710, y: 380, w: 180, h: 190, color: '#141e2b', border: this.theme.secondary },
                // Center Divider Isle
                { x: 470, y: 240, w: 120, h: 220, color: '#1e142f', border: this.theme.primary }
            ];
            this.roundabouts = [];
            this.roundabout = null;
        } else if (stage === 4) {
            // Stage 4: Maximum Overdrive — Dual Roundabouts & Fortified Center
            this.buildings = [
                { x: 160, y: 120, w: 160, h: 140, color: '#240d1a', border: this.theme.primary },
                { x: 740, y: 120, w: 160, h: 140, color: '#240d1a', border: this.theme.primary },
                { x: 160, y: 440, w: 160, h: 140, color: '#240d1a', border: this.theme.primary },
                { x: 740, y: 440, w: 160, h: 140, color: '#240d1a', border: this.theme.primary },
                // Central High-Security Core
                { x: 450, y: 280, w: 160, h: 140, color: '#15151e', border: this.theme.secondary }
            ];
            // Dual circular escape roundabouts
            this.roundabouts = [
                { x: 300, y: 350, radius: 45, color: this.theme.primary },
                { x: 760, y: 350, radius: 45, color: this.theme.primary }
            ];
            this.roundabout = this.roundabouts[0];
        }
    }

    #generateCollisionBorders() {
        this.borders = [...this.outerBounds];

        // Building borders
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

        // Circular roundabout borders
        for (const r of this.roundabouts) {
            const steps = 12;
            for (let i = 0; i < steps; i++) {
                const a1 = (i / steps) * Math.PI * 2;
                const a2 = ((i + 1) / steps) * Math.PI * 2;
                const p1 = { x: r.x + Math.cos(a1) * r.radius, y: r.y + Math.sin(a1) * r.radius };
                const p2 = { x: r.x + Math.cos(a2) * r.radius, y: r.y + Math.sin(a2) * r.radius };
                this.borders.push([p1, p2]);
            }
        }
    }

    draw(ctx) {
        // 1. Dark Asphalt Ground
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. City Grid with Stage Accent Color
        ctx.save();
        ctx.strokeStyle = this.theme.gridColor;
        ctx.lineWidth = 1;

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

        // Dashed Lane Dividers
        ctx.setLineDash([12, 16]);
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 40);
        ctx.lineTo(this.width / 2, this.height - 40);
        ctx.moveTo(40, this.height / 2);
        ctx.lineTo(this.width - 40, this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 3. Buildings with Neon Edge Glow
        for (const b of this.buildings) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(b.x + 8, b.y + 8, b.w, b.h);

            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            ctx.strokeStyle = b.border;
            ctx.shadowColor = b.border;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fillRect(b.x + 15, b.y + 15, b.w - 30, b.h - 30);
            ctx.restore();
        }

        // 4. Roundabouts
        for (const r of this.roundabouts) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#141d2f';
            ctx.fill();
            ctx.strokeStyle = r.color;
            ctx.shadowColor = r.color;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Center neon fountain/core
            ctx.beginPath();
            ctx.arc(r.x, r.y, 16, 0, Math.PI * 2);
            ctx.fillStyle = r.color;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.restore();
        }

        // 5. Outer Perimeter Boundary
        ctx.save();
        ctx.beginPath();
        const m = 35;
        ctx.rect(m, m, this.width - m * 2, this.height - m * 2);
        ctx.strokeStyle = this.theme.borderGlow;
        ctx.shadowColor = this.theme.borderGlow;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}
