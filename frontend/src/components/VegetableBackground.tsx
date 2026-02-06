import React, { useEffect, useRef } from 'react';

// --- Premium Vegetable SVGs ---
// Detailed, organic illustrations with soft depth and vibrant but pastel-friendly colors.

const Tomato = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="tomato-body" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#ff7b7b" />
                <stop offset="100%" stopColor="#e53e3e" />
            </radialGradient>
            <filter id="shadow-t" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#9f1239" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#shadow-t)" transform="translate(0, 2)">
            {/* Main Body */}
            <circle cx="50" cy="50" r="40" fill="url(#tomato-body)" />
            {/* Shine */}
            <ellipse cx="35" cy="35" rx="12" ry="8" fill="white" opacity="0.2" transform="rotate(-45, 35, 35)" />
            <ellipse cx="65" cy="65" rx="6" ry="4" fill="#991b1b" opacity="0.1" />

            {/* Stem */}
            <path d="M50,15 L50,10 M50,15 Q62,8 70,22 M50,15 Q38,8 30,22 M50,15 Q55,25 50,32"
                stroke="#15803d" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="15" r="3" fill="#166534" />
        </g>
    </svg>
);

const Carrot = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <linearGradient id="carrot-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <filter id="shadow-c" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#7c2d12" floodOpacity="0.12" />
            </filter>
        </defs>
        <g filter="url(#shadow-c)" transform="rotate(-45, 50, 50)">
            {/* Body */}
            <path d="M50,15 Q65,15 62,80 Q50,95 38,80 Q35,15 50,15" fill="url(#carrot-grad)" />
            {/* Texture Lines */}
            <path d="M38,30 L62,30 M40,45 L60,45 M42,60 L58,60"
                stroke="#9a3412" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
            {/* Greens */}
            <path d="M45,15 Q40,0 25,5 M50,15 Q50,-5 50,0 M55,15 Q60,0 75,5"
                stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
    </svg>
);

const Onion = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="onion-grad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="100%" stopColor="#9333ea" />
            </radialGradient>
            <filter id="shadow-o" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#581c87" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#shadow-o)">
            <path d="M50,5 Q88,35 88,60 Q88,92 50,92 Q12,92 12,60 Q12,35 50,5" fill="url(#onion-grad)" />
            {/* Lines */}
            <path d="M50,92 Q50,60 50,5" stroke="#7e22ce" strokeWidth="1" opacity="0.2" fill="none" />
            <path d="M25,75 Q35,50 50,5" stroke="#7e22ce" strokeWidth="1" opacity="0.2" fill="none" />
            <path d="M75,75 Q65,50 50,5" stroke="#7e22ce" strokeWidth="1" opacity="0.2" fill="none" />
            {/* Sprout */}
            <path d="M50,5 L50,-5" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
        </g>
    </svg>
);

const Broccoli = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <filter id="shadow-b" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#14532d" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#shadow-b)">
            <path d="M50,55 L50,85 Q50,95 60,95 L63,65" stroke="#4ade80" strokeWidth="8" fill="none" strokeLinecap="round" />
            {/* Florets */}
            <g fill="#22c55e">
                <circle cx="50" cy="45" r="22" />
                <circle cx="30" cy="40" r="16" />
                <circle cx="70" cy="40" r="16" />
                <circle cx="50" cy="25" r="18" />
                <circle cx="30" cy="25" r="12" fill="#4ade80" />
                <circle cx="70" cy="25" r="12" fill="#4ade80" />
            </g>
            <circle cx="45" cy="40" r="2" fill="#14532d" opacity="0.1" />
            <circle cx="55" cy="50" r="3" fill="#14532d" opacity="0.1" />
        </g>
    </svg>
);

const Capsicum = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <radialGradient id="cap-grad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#eab308" />
            </radialGradient>
            <filter id="shadow-ca" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#854d0e" floodOpacity="0.15" />
            </filter>
        </defs>
        <g filter="url(#shadow-ca)">
            <rect x="20" y="25" width="60" height="55" rx="18" fill="url(#cap-grad)" />
            {/* Lobes */}
            <path d="M35,25 L35,80 M50,25 L50,80 M65,25 L65,80" stroke="#ca8a04" strokeWidth="1" opacity="0.15" />
            {/* Stem */}
            <path d="M50,25 L50,15 M45,15 L55,15" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
            {/* Shine */}
            <path d="M28,35 Q25,50 28,65" stroke="white" strokeWidth="3" opacity="0.3" fill="none" strokeLinecap="round" />
        </g>
    </svg>
);

const Spinach = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} style={{ overflow: 'visible' }}>
        <defs>
            <filter id="shadow-s" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#064e3b" floodOpacity="0.15" />
            </filter>
            <linearGradient id="spinach-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
        </defs>
        <g filter="url(#shadow-s)">
            <path d="M50,90 Q15,70 20,35 Q30,5 50,5 Q70,5 80,35 Q85,70 50,90 Z" fill="url(#spinach-grad)" />
            <path d="M50,90 Q50,50 50,20" stroke="#86efac" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M50,60 Q30,50 25,40 M50,55 Q70,45 75,35" stroke="#86efac" strokeWidth="1" fill="none" opacity="0.4" />
        </g>
    </svg>
);

// --- Particle Configuration ---

interface ParticleConfig {
    Component: React.FC<{ className?: string }>;
    x: number; // % position
    y: number; // % position
    size: number; // rem
    depth: number; // 0.5 (far) to 2.0 (near)
    baseRotation: number;
    // Physics
    mass: number;     // Higher mass = slower accel
    drag: number;     // 0.90 (slippery) -> 0.98 (thick fluid)
    stiffness: number; // 0.01 (loose) -> 0.1 (tight)
}

const PARTICLES: ParticleConfig[] = [
    // Top Left
    { Component: Tomato, x: 10, y: 15, size: 4.8, depth: 1.4, baseRotation: -20, mass: 1.5, drag: 0.94, stiffness: 0.03 },
    { Component: Spinach, x: 25, y: 8, size: 3.2, depth: 0.6, baseRotation: 60, mass: 0.8, drag: 0.96, stiffness: 0.02 },

    // Top Right
    { Component: Carrot, x: 88, y: 18, size: 6, depth: 1.3, baseRotation: 25, mass: 1.2, drag: 0.93, stiffness: 0.03 },
    { Component: Onion, x: 72, y: 12, size: 4.2, depth: 0.8, baseRotation: -15, mass: 1.0, drag: 0.95, stiffness: 0.025 },

    // Middle / Sides (Far elements)
    { Component: Capsicum, x: 5, y: 55, size: 4.5, depth: 0.9, baseRotation: 10, mass: 1.4, drag: 0.94, stiffness: 0.03 },
    { Component: Broccoli, x: 95, y: 65, size: 5.0, depth: 1.6, baseRotation: -10, mass: 1.8, drag: 0.92, stiffness: 0.04 },

    // Bottom
    { Component: Tomato, x: 20, y: 85, size: 3.5, depth: 0.7, baseRotation: 45, mass: 0.9, drag: 0.96, stiffness: 0.02 },
    { Component: Spinach, x: 80, y: 88, size: 3.8, depth: 1.0, baseRotation: -30, mass: 1.1, drag: 0.95, stiffness: 0.03 },
    { Component: Onion, x: 50, y: 95, size: 3, depth: 0.5, baseRotation: 190, mass: 0.7, drag: 0.97, stiffness: 0.015 },
];

export const VegetableBackground = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const particleRefs = useRef<(HTMLDivElement | null)[]>([]);
    const reqRef = useRef<number>();

    // Physics state
    // x, y: position offset
    // vx, vy: velocity
    // rot: current extra rotation
    // vRot: rotation velocity
    const physicsState = useRef(PARTICLES.map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, rot: 0, vRot: 0
    })));

    const mouse = useRef({ x: -9999, y: -9999, isActive: false });

    // Handle high-frequency events efficiently
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            // Check bounds with buffer
            const buffer = 100;
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
        // Reduced motion check
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

                // --- 1. Forces Calculation ---

                // Spring Force (Hooke's Law): Pull back to origin (0,0)
                // F = -k * x
                const springFx = -state.x * config.stiffness;
                const springFy = -state.y * config.stiffness;

                let mouseFx = 0;
                let mouseFy = 0;

                // Mouse Repel Force
                // F = (1 - dist/radius) * strength
                if (mouse.current.isActive) {
                    const baseX = (config.x / 100) * rect.width;
                    const baseY = (config.y / 100) * rect.height;
                    const absoluteX = baseX + state.x;
                    const absoluteY = baseY + state.y;

                    const dx = mouse.current.x - absoluteX;
                    const dy = mouse.current.y - absoluteY;
                    const distSq = dx * dx + dy * dy;
                    const radius = 300; // Interaction radius
                    const radiusSq = radius * radius;

                    if (distSq < radiusSq) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / radius) * 20 * config.depth; // Deeper items move more

                        // Normalized direction * force
                        mouseFx = -(dx / dist) * force;
                        mouseFy = -(dy / dist) * force;
                    }
                }

                // Ambient Drift (Perlin-ish noise using sine waves)
                // Multi-frequency for organic feel
                const driftFx = (Math.cos(time * 0.5 + i) + Math.sin(time * 0.3 + i * 2)) * 0.15 * config.depth;
                const driftFy = (Math.sin(time * 0.4 + i) + Math.cos(time * 0.2 + i * 3)) * 0.15 * config.depth;


                // --- 2. Integration (Verlet/Euler) ---

                // Acceleration = Force / Mass
                const ax = (springFx + mouseFx + driftFx) / config.mass;
                const ay = (springFy + mouseFy + driftFy) / config.mass;

                // Velocity update
                state.vx += ax;
                state.vy += ay;

                // Friction/Drag
                state.vx *= config.drag;
                state.vy *= config.drag;

                // Position update
                state.x += state.vx;
                state.y += state.vy;

                // --- 3. Rotation Logic ---
                // "Antigravity" items often spin when pushed
                // Torque based on velocity magnitude and direction
                const velocityMag = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
                const targetRotVelocity = state.vx * 0.5; // Spin based on horizontal movement

                // Smooth rotation velocity
                state.vRot += (targetRotVelocity - state.vRot) * 0.1;
                state.rot += state.vRot;

                // Limit rotation to avoid spinning like a top forever
                state.rot *= 0.95;

                // --- 4. Render ---
                const scale = 1 + velocityMag * 0.02; // Stretch slightly when fast

                el.style.transform = `
                    translate3d(${state.x}px, ${state.y}px, 0) 
                    rotate(${config.baseRotation + state.rot}deg) 
                    scale(${scale})
                `;
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
            className="absolute inset-0 pointer-events-none overflow-hidden" // ensures no scrollbars
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
                        // Far items are blurrier and more transparent (Atmospheric Perspective)
                        filter: p.depth < 1.0 ? `blur(${(1 - p.depth) * 3}px)` : 'none',
                        opacity: p.depth < 0.8 ? 0.6 : 0.9,
                        // Layering: Closer items on top
                        zIndex: Math.floor(p.depth * 10)
                    }}
                >
                    <p.Component className="w-full h-full drop-shadow-md" />
                </div>
            ))}
        </div>
    );
};
