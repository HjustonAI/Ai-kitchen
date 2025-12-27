
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    alpha: number;
}

export class ParticleSystem {
    particles: Particle[] = [];

    emit(x: number, y: number, count: number = 1, options: {
        color?: string,
        speed?: number,
        size?: number,
        spread?: number,
        life?: number
    } = {}) {
        const {
            color = '#00f3ff',
            speed = 1,
            size = 2,
            spread = Math.PI * 2,
            life = 60
        } = options;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * spread;
            const velocity = Math.random() * speed;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: Math.random() * life + life / 2,
                maxLife: life * 1.5,
                size: Math.random() * size + 1,
                color,
                alpha: 1
            });
        }
    }

    update() {
        let aliveCount = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Update logic
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life > 0) {
                // Keep alive: Move to front of array if needed (Swap-and-Pop variant)
                // Actually, simpler Swap-and-Pop for unordered:
                // If dead, swap with last and pop.
                // But iterating requires care.
                // Let's stick to the standard "Swap with last" pattern inside a reverse loop or while loop.
                aliveCount++;
            } else {
                // Swap with last element
                const last = this.particles[this.particles.length - 1];
                this.particles[i] = last;
                this.particles.pop();
                // Re-process this index since it now holds the swapped particle
                i--;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, view: { x: number, y: number, scale: number }) {
        ctx.save();
        this.particles.forEach(p => {
            const screenX = view.x + p.x * view.scale;
            const screenY = view.y + p.y * view.scale;
            const screenSize = p.size * view.scale;

            if (screenX < -50 || screenY < -50 || screenX > ctx.canvas.width + 50 || screenY > ctx.canvas.height + 50) return;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}
