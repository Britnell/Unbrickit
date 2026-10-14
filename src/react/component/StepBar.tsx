/** segmented progress bar: `filled` of `total` chunks, single color by fullness */
export function StepBar({
  filled,
  total = 4,
}: {
  filled: number;
  total?: number;
}) {
  const clamped = Math.max(0, Math.min(total, filled));
  // fraction of chunks filled: 1 = all, 0 = none
  const frac = clamped / total;
  const color =
    frac <= 0.25
      ? "bg-red-500"
      : frac < 1
        ? "bg-orange-400"
        : "bg-green-500";
  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-3 flex-1 rounded ${i < clamped ? color : "bg-black/10"}`}
        />
      ))}
    </div>
  );
}

export default StepBar;
