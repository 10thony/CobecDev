import { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}

export function BentoGrid({
  children,
  className = "",
  columns = 4,
}: BentoGridProps) {
  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div
      className={`
        grid
        ${gridCols[columns]}
        gap-4
        auto-rows-fr
        ${className}
      `}
    >
      {children}
    </div>
  );
}
