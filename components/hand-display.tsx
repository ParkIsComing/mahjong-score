"use client";

import { ALL_TILES, tileEmoji } from "@/lib/tiles";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HandDisplayProps {
  tiles: string[];
  onChange: (tiles: string[]) => void;
}

export function HandDisplay({ tiles, onChange }: HandDisplayProps) {
  function removeTile(index: number) {
    onChange(tiles.filter((_, i) => i !== index));
  }

  function changeTile(index: number, value: string | null) {
    if (!value) return;
    const next = [...tiles];
    next[index] = value;
    onChange(next);
  }

  function addTile(value: string | null) {
    if (!value) return;
    if (tiles.length < 14) onChange([...tiles, value]);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        인식된 패 ({tiles.length}장) — 클릭해서 수정
      </p>
      <div className="flex flex-wrap gap-2">
        {tiles.map((tile, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Select value={tile ?? ""} onValueChange={(v) => changeTile(i, v)}>
              <SelectTrigger className="w-16 h-12 text-2xl border-2 p-0 justify-center">
                <SelectValue>{tileEmoji(tile)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {ALL_TILES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tileEmoji(t)} {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => removeTile(i)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {tiles.length < 14 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">패 추가:</span>
          <Select onValueChange={addTile}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {ALL_TILES.map((t) => (
                <SelectItem key={t} value={t}>
                  {tileEmoji(t)} {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
