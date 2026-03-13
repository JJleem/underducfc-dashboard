// app/components/UnderduckSpinner.tsx
import React from "react";
import Image from "next/image";

type SpinnerProps = {
  iconWidth?: number;
  iconHeight?: number;
};

const UnderduckSpinner = ({}: SpinnerProps) => {
  return (
    <div className="relative flex items-center justify-center w-[100px] h-[100px]">
      <style>{`
        .udk-spinner-svg {
          animation: udk-rotate 2s linear infinite;
          transform-origin: center center;
        }
        
        .udk-spinner-circle {
          fill: none;
          stroke-width: 4.5;
          stroke-linecap: round;
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
          animation: udk-dash 1.5s ease-in-out infinite;
          stroke: url(#underduck-light);
        }

        .dark .udk-spinner-circle {
          stroke: url(#underduck-dark);
        }

        .udk-center-icon {
          animation: udk-icon-spin 4s ease-in-out infinite;
          transform-origin: center center;
        }

        @keyframes udk-rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes udk-dash {
          0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35px; }
          100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124px; }
        }
        @keyframes udk-icon-spin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(360deg) scale(1); }
          30% { transform: rotate(360deg) scale(1); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>

      <svg
        className="absolute w-full h-full udk-spinner-svg"
        viewBox="25 25 50 50"
      >
        <defs>
          <linearGradient
            id="underduck-light"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#FF8FA3" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="underduck-dark" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB6C1" />
            <stop offset="100%" stopColor="#F5F5DC" />
          </linearGradient>
        </defs>

        <circle className="udk-spinner-circle" cx="50" cy="50" r="20" />
      </svg>

      {/* 💡 2. p-0.5로 패딩 최소화, bg-transparent로 로고 본연의 크기 강조 */}
      <div className="absolute z-10 flex items-center justify-center rounded-full overflow-hidden udk-center-icon shadow-sm bg-white dark:bg-black w-[80%] h-[80%]">
        <Image
          src="/underducklogo.png"
          alt="Loading..."
          fill
          className="object-cover p-0"
        />
      </div>
    </div>
  );
};

export default UnderduckSpinner;
