interface StateTooltipProps {
  stateCode: string;
  linkCount: number;
  position: { x: number; y: number };
}

export function StateTooltip({
  stateCode,
  linkCount,
  position,
}: StateTooltipProps) {
  return (
    <div
      className="absolute z-50 bg-tron-bg-panel border border-tron-cyan/30 text-tron-white px-3 py-2 rounded-lg shadow-tron-glow text-sm pointer-events-none"
      style={{
        left: `${position.x + 12}px`,
        top: `${position.y - 40}px`,
      }}
    >
      <div className="font-semibold text-tron-cyan">{stateCode}</div>
      <div className="text-xs text-tron-gray">
        {linkCount} resource{linkCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
