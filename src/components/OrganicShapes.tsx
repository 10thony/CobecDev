import { ReactNode } from "react";

interface OrganicUnderlineProps {
  className?: string;
  color?: string;
}

export function OrganicUnderline({
  className = "",
  color = "#00d4ff",
}: OrganicUnderlineProps) {
  return (
    <svg
      className={className}
      width="100%"
      height="8"
      viewBox="0 0 200 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4.5C15 3, 25 5, 35 4C45 3, 55 5.5, 65 4.2C75 3, 85 5, 95 4.5C105 4, 115 5.5, 125 4.2C135 3.5, 145 5, 155 4.3C165 3.8, 175 5.2, 185 4.5C195 3.8, 200 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

interface OrganicArrowProps {
  className?: string;
  color?: string;
  direction?: "right" | "left" | "up" | "down";
}

export function OrganicArrow({
  className = "",
  color = "#00d4ff",
  direction = "right",
}: OrganicArrowProps) {
  const rotations = {
    right: "0",
    left: "180",
    up: "-90",
    down: "90",
  };

  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotations[direction]}deg)` }}
    >
      <path
        d="M5 12C5 10, 7 8, 12 12C17 16, 19 14, 19 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M19 12L15 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

interface GrainTextureProps {
  className?: string;
  opacity?: number;
}

export function GrainTexture({
  className = "",
  opacity = 0.03,
}: GrainTextureProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${opacity}'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay",
      }}
    />
  );
}

interface HandDrawnLineProps {
  className?: string;
  color?: string;
  width?: string;
}

export function HandDrawnLine({
  className = "",
  color = "#00d4ff",
  width = "100%",
}: HandDrawnLineProps) {
  return (
    <svg
      className={className}
      width={width}
      height="2"
      viewBox="0 0 200 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 1C20 0.5, 40 1.5, 60 1C80 0.8, 100 1.2, 120 1C140 0.9, 160 1.1, 180 1C200 0.95"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}
