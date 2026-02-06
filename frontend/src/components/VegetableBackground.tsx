import React, { useEffect, useRef } from 'react';

// --- Vegetable SVGs ---
// High-quality, lightweight SVGs with organic gradients and soft shadows

const Tomato = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="tomato-glow" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>
            <filter id="soft-shadow-t" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#soft-shadow-t)">
            <circle cx="50" cy="50" r="42" fill="url(#tomato-glow)" />
            <path d="M50,15 Q65,5 75,25 Q50,30 25,25 Q35,5 50,15" fill="#15803d" />
            <circle cx="35" cy="35" r="3" fill="#fff" opacity="0.4" />
        </g>
    </svg>
);

const Carrot = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <linearGradient id="carrot-body" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <filter id="soft-shadow-c" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#soft-shadow-c)" transform="rotate(-45, 50, 50)">
            <path d="M50,15 Q65,15 60,85 Q50,95 40,85 Q35,15 50,15" fill="url(#carrot-body)" />
            <path d="M35,25 L65,25 M38,40 L62,40 M42,55 L58,55" stroke="#9a3412" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
            <path d="M50,15 Q40,0 30,5 M50,15 Q50,-5 50,0 M50,15 Q60,0 70,5" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
    </svg>
);

const Onion = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="onion-skin" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="100%" stopColor="#a855f7" />
            </radialGradient>
            <filter id="soft-shadow-o" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#soft-shadow-o)">
            <path d="M50,10 Q85,40 85,60 Q85,90 50,90 Q15,90 15,60 Q15,40 50,10" fill="url(#onion-skin)" />
            <path d="M50,10 L50,0" stroke="#a855f7" strokeWidth="3" />
            <path d="M30,30 Q50,20 70,30" fill="none" stroke="#7e22ce" strokeWidth="0.5" opacity="0.3" />
            <path d="M20,50 Q50,40 80,50" fill="none" stroke="#7e22ce" strokeWidth="0.5" opacity="0.3" />
        </g>
    </svg>
);

const Broccoli = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <filter id="soft-shadow-b" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
        </filter>
        <g filter="url(#soft-shadow-b)">
            <path d="M50,60 L50,85 Q50,95 60,95 L60,65" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="45" r="25" fill="#4ade80" />
            <circle cx="30" cy="40" r="18" fill="#22c55e" />
            <circle cx="70" cy="40" r="18" fill="#22c55e" />
            <circle cx="50" cy="25" r="20" fill="#4ade80" />
        </g>
    </svg>
);

const Capsicum = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="capsicum-shine" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <filter id="soft-shadow-ca" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#soft-shadow-ca)">
            <rect x="25" y="25" width="50" height="50" rx="15" fill="url(#capsicum-shine)" />
            <path d="M35,25 Q25,25 25,40 L25,60 Q25,75 35,75 L65,75 Q75,75 75,60 L75,40 Q75,25 65,25 Z" fill="url(#capsicum-shine)" />
            <path d="M50,25 L50,15" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
        </g>
    </svg>
);

const Spinach = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <filter id="soft-shadow-s" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
        </filter>
        <g filter="url(#soft-shadow-s)">
            <path d="M50,85 Q20,60 20,30 Q50,0 80,30 Q80,60 50,85Z" fill="#22c55e" />
            <path d="M50,85 Q50,45 50,15" stroke="#86efac" strokeWidth="1" fill="none" />
        </g>
    </svg>
);

// --- Particle Logic ---

interface ParticleConfig {
    Component: React.FC<{ className?: string }>;
    x: number; // % position
    y: number; // % position
    size: number; // rem
    depth: number; // 0.5 (far) to 2.0 (near)
    baseRotation: number;
    // Physics properties
    mass: number;     // Heavier objects move slower
    drag: number;     // Friction (0.85 - 0.95)
    stiffness: number; // Spring tension (0.05 - 0.1)
}

const PARTICLES: ParticleConfig[] = [
    // Top Left Cluster
    { Component: Tomato, x: 12, y: 18, size: 4.5, depth: 1.2, baseRotation: -15, mass: 1.2, drag: 0.92, stiffness: 0.08 },
    { Component: Spinach, x: 28, y: 12, size: 3.5, depth: 0.6, baseRotation: 45, mass: 0.8, drag: 0.95, stiffness: 0.06 },

    // Top Right Cluster
    { Component: Carrot, x: 82, y: 25, size: 5.5, depth: 1.5, baseRotation: 15, mass: 1.4, drag: 0.91, stiffness: 0.09 },
    { Component: Onion, x: 68, y: 15, size: 4, depth: 0.8, baseRotation: -10, mass: 1.0, drag: 0.93, stiffness: 0.07 },

    // Middle / Sides
    { Component: Broccoli, x: 8, y: 55, size: 5, depth: 1.8, baseRotation: 5, mass: 1.6, drag: 0.90, stiffness: 0.1 },
    { Component: Capsicum, x: 92, y: 58, size: 4.2, depth: 1.4, baseRotation: -25, mass: 1.3, drag: 0.92, stiffness: 0.08 },

    // Bottom Elements
    { Component: Tomato, x: 25, y: 82, size: 3.8, depth: 0.7, baseRotation: 10, mass: 0.9, drag: 0.94, stiffness: 0.07 },
    { Component: Spinach, x: 75, y: 85, size: 4.2, depth: 1.1, baseRotation: -20, mass: 1.1, drag: 0.93, stiffness: 0.08 },
    { Component: Onion, x: 50, y: 92, size: 3.2, depth: 0.5, baseRotation: 160, mass: 0.7, drag: 0.96, stiffness: 0.05 },
];

export const VegetableBackground = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const particleRefs = useRef<(HTMLDivElement | null)[]>([]);
    const reqRef = useRef<number>();

    // Physics state
    const physicsState = useRef(PARTICLES.map(() => ({
        x: 0,   // Current offset from base
        y: 0,
        vx: 0,  // Velocity
        vy: 0,
        rot: 0, // Rotation offset
    })));

    const mouse = useRef({ x: -1000, y: -1000, isActive: false });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            // Only activate if nearby
            const buffer = 150;
            if (
                e.clientX > rect.left - buffer &&
                e.clientX < rect.right + buffer &&
                e.clientY > rect.top - buffer &&
                e.clientY < rect.bottom + buffer
            ) {
                mouse.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    isActive: true
                };
            } else {
                mouse.current.isActive = false;
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let time = 0;
        const animate = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            time += 0.01;

            physicsState.current.forEach((state, i) => {
                const config = PARTICLES[i];
                const el = particleRefs.current[i];
                if (!el) return;

                // 1. Calculate Base Position (Pixel)
                const baseX = (config.x / 100) * rect.width;
                const baseY = (config.y / 100) * rect.height;
                const currentAbsX = baseX + state.x;
                const currentAbsY = baseY + state.y;

                // 2. Spring Force (Return to origin)
                // Hooke's Law: F = -k * displacement
                const springFx = -state.x * config.stiffness;
                const springFy = -state.y * config.stiffness;

                // 3. Mouse Repel Force
                let mouseFx = 0;
                let mouseFy = 0;

                if (mouse.current.isActive) {
                    const dx = mouse.current.x - currentAbsX;
                    const dy = mouse.current.y - currentAbsY;
                    const distSq = dx * dx + dy * dy;
                    const range = 350; // Interaction radius
                    const rangeSq = range * range;

                    if (distSq < rangeSq) {
                        const dist = Math.sqrt(distSq);
                        const nDist = dist / range; // 0..1
                        // Smoother ease-out curve for force
                        const pct = 1 - nDist;
                        const strength = pct * pct * 300 * config.depth; // Deeper = stronger interaction (parallax)

                        // Normalized vector * strength
                        mouseFx = -(dx / dist) * strength;
                        mouseFy = -(dy / dist) * strength;
                    }
                }

                // 4. Ambient Drift (Gentle sine wave)
                const driftFx = Math.cos(time + i) * 0.2 * config.depth;
                const driftFy = Math.sin(time * 0.8 + i) * 0.2 * config.depth;

                // 5. Apply Forces to Velocity (F = ma => a = F/m)
                state.vx += (springFx + mouseFx + driftFx) / config.mass;
                state.vy += (springFy + mouseFy + driftFy) / config.mass;

                // 6. Apply Friction
                state.vx *= config.drag;
                state.vy *= config.drag;

                // 7. Update Position
                state.x += state.vx;
                state.y += state.vy;

                // 8. Dynamic Tilt based on Move X
                // Tilt more when moving fast horizontally
                const targetRot = state.vx * 2;
                state.rot += (targetRot - state.rot) * 0.1;

                // 9. Render
                const finalScale = 1 + (Math.abs(state.x) + Math.abs(state.y)) * 0.0005; // Slight grow on move
                el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${config.baseRotation + state.rot}deg) scale(${finalScale})`;
            });

            reqRef.current = requestAnimationFrame(animate);
        };

        reqRef.current = requestAnimationFrame(animate);
        return () => {
            if (reqRef.current) cancelAnimationFrame(reqRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
        >
            {PARTICLES.map((p, i) => (
                <div
                    key={i}
                    ref={el => particleRefs.current[i] = el}
                    className="absolute will-change-transform"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}rem`,
                        height: `${p.size}rem`,
                        // Depth Blur: Far items (low depth) are blurry
                        filter: p.depth < 0.8 ? 'blur(1.5px)' : 'none',
                        zIndex: Math.floor(p.depth * 10),
                        opacity: p.depth < 0.8 ? 0.7 : 0.95
                    }}
                >
                    <p.Component className="w-full h-full drop-shadow-lg" />
                </div>
            ))}
        </div>
    );
};
