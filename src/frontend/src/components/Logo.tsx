export default function Logo({ ...props }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="75 75 350 350" {...props}>
            <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="#1E293B" />
                </pattern>

                <linearGradient id="cyanGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00C6FF" />
                    <stop offset="100%" stop-color="#0072FF" />
                </linearGradient>

                <linearGradient id="magentaGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#F107A3" />
                    <stop offset="100%" stop-color="#7B2FF7" />
                </linearGradient>

                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
                </filter>

                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <g filter="url(#shadow)" opacity="0.9" style={{ mixBlendMode: "screen" }}>
                <rect x="125" y="145" width="160" height="150" rx="55" fill="url(#cyanGrad)" />
                <path d="M 160 285 Q 120 315, 105 345 Q 145 330, 185 292 Z" fill="url(#cyanGrad)" />
            </g>

            <g filter="url(#shadow)" opacity="0.9" style={{ mixBlendMode: "screen" }}>
                <rect x="215" y="145" width="160" height="150" rx="55" fill="url(#magentaGrad)" />
                <path d="M 340 155 Q 380 125, 395 95 Q 355 110, 315 148 Z" fill="url(#magentaGrad)" />
            </g>

            <g>
                <circle cx="150" cy="220" r="4" fill="#FFFFFF" opacity="0.3" />
                <circle cx="180" cy="220" r="6" fill="#FFFFFF" opacity="0.6" />
                <circle cx="210" cy="220" r="8" fill="#FFFFFF" opacity="0.9" />

                <circle cx="350" cy="220" r="4" fill="#FFFFFF" opacity="0.3" />
                <circle cx="320" cy="220" r="6" fill="#FFFFFF" opacity="0.6" />
                <circle cx="290" cy="220" r="8" fill="#FFFFFF" opacity="0.9" />
            </g>

            <g>
                <circle cx="250" cy="220" r="28" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.3" />
                <circle cx="250" cy="220" r="18" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6" />
                <circle cx="250" cy="220" r="10" fill="#FFFFFF" filter="url(#glow)" />
            </g>

            <text x="250" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#F8FAFC" text-anchor="middle" letter-spacing="6" className="select-none">CONFLUX</text>
        </svg>
    );
}