import * as React from "react"

interface MacroProgressProps {
  value: number;
  label: string;
  icon: string;
  amount: string | number;
  unit?: string;
}

export function MacroProgress({ value, label, icon, amount, unit = "g" }: MacroProgressProps) {
  const size = 48;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
      <div>
        <div className="text-lg font-medium">{amount}{unit}</div>
        <div className="text-xs text-gray-500 mb-2">{label}</div>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#0CC5BA"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500 ease-in-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base">{icon}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
