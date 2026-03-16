"use client";

import { ALL_TILES, tileEmoji } from "@/lib/tiles";

interface TileSelectorProps {
  label: string;
  value: string;
  onChange: (tile: string) => void;
}

export function TileSelector({ label, value, onChange }: TileSelectorProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1 max-w-sm">
        {ALL_TILES.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`text-xl w-9 h-9 rounded border transition-colors ${
              value === t
                ? "border-primary bg-primary/10"
                : "border-muted hover:border-primary/50"
            }`}
            title={t}
          >
            {tileEmoji(t)}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-muted-foreground">
          선택: {tileEmoji(value)} ({value})
        </p>
      )}
    </div>
  );
}
