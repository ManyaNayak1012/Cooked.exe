"use client";

const LEVELS = [
  { value: 1, label: "LIGHT TEASING" },
  { value: 2, label: "WARM" },
  { value: 3, label: "SAVAGE" },
  { value: 4, label: "SCORCHED" },
  { value: 5, label: "NO SURVIVORS" },
];

export default function HeatDial({ value, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[11px] tracking-widest text-fade">HEAT LEVEL</span>
        <span className="text-[11px] font-semibold text-magenta glow-text-magenta">
          {LEVELS.find((l) => l.value === value)?.label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            aria-label={l.label}
            aria-pressed={value === l.value}
            onClick={() => onChange(l.value)}
            className={`focus-ring h-7 flex-1 border transition-all ${
              l.value <= value
                ? "border-magenta bg-magenta/70 shadow-neonMagenta"
                : "border-purple/30 bg-transparent"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
