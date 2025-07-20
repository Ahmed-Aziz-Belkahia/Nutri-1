import { cn } from "@/lib/utils";

interface WaterGlassProps {
  percentage: number; // 0-100
  className?: string;
}

export default function WaterGlass({ percentage, className }: WaterGlassProps) {
  // Calculate the water level position
  const waterLevel = Math.max(110 - (percentage * 0.9), 20); // Clamp between glass top and bottom
  
  return (
    <div className={cn("relative w-full aspect-[1/1.2]", className)}>
      <svg
        viewBox="0 0 100 120"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* More pronounced water gradient */}
          <linearGradient id="waterGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          </linearGradient>
          
          {/* Glass gradient for more depth */}
          <linearGradient id="glassGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
          
          <clipPath id="glassClip">
            <path d="M20 20 L30 110 L70 110 L80 20 Z" />
          </clipPath>
        </defs>

        {/* Glass container with gradient */}
        <path
          d="M20 20 L30 110 L70 110 L80 20 Z"
          fill="url(#glassGradient)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="opacity-30"
        />

        <g clipPath="url(#glassClip)">
          {/* Animated water base */}
          <path
            d={`M0 ${waterLevel} L100 ${waterLevel} L100 120 L0 120 Z`}
            fill="url(#waterGradient)"
            className="transition-all duration-1000 ease-in-out"
          >
            <animate
              attributeName="d"
              values={`
                M0 ${waterLevel} L100 ${waterLevel} L100 120 L0 120 Z;
                M0 ${waterLevel - 2} L100 ${waterLevel - 2} L100 120 L0 120 Z;
                M0 ${waterLevel} L100 ${waterLevel} L100 120 L0 120 Z
              `}
              dur="2s"
              repeatCount="indefinite"
            />
          </path>

          {/* Multiple animated waves for more dynamic effect */}
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(0,${waterLevel})`}>
              <path
                d="M0 0 Q 25 -4, 50 0 T 100 0"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity={0.3 - i * 0.1}
                className="mix-blend-overlay"
              >
                <animate
                  attributeName="d"
                  values={`
                    M0 0 Q 25 -4, 50 0 T 100 0;
                    M0 0 Q 25 4, 50 0 T 100 0;
                    M0 0 Q 25 -4, 50 0 T 100 0
                  `}
                  dur={`${2 + i * 0.5}s`}
                  repeatCount="indefinite"
                />
              </path>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
