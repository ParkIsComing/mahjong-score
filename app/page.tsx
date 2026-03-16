"use client";

import { useState } from "react";
import { calculateScore, ScoreRequest, ScoreResponse } from "@/lib/api";
import { ScoreResult } from "@/components/score-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tileEmoji } from "@/lib/tiles";

const WINDS = ["east", "south", "west", "north"] as const;
const WIND_LABEL: Record<string, string> = { east: "동", south: "남", west: "서", north: "북" };
type Wind = (typeof WINDS)[number];

const TILE_GROUPS = [
  { label: "만수 (Man) — 한자 패", tiles: Array.from({ length: 9 }, (_, i) => `${i + 1}m`) },
  { label: "통수 (Pin) — 원 패", tiles: Array.from({ length: 9 }, (_, i) => `${i + 1}p`) },
  { label: "삭수 (Sou) — 대나무 패", tiles: Array.from({ length: 9 }, (_, i) => `${i + 1}s`) },
  { label: "자패 (Honor) — 바람/용 패", tiles: ["east", "south", "west", "north", "white", "green", "red"] },
];

const DORA_TILES = [
  "",
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}m`),
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}p`),
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}s`),
  "east", "south", "west", "north", "white", "green", "red",
];

const NO_YAKU_HINT =
  "역이 없습니다.\n힌트: 리치 없이 화료하려면 탕야오(2~8패만), 역패(삼원패·자풍·장풍 커쯔) 등 역이 필요합니다.";

export default function Home() {
  const [hand, setHand] = useState<string[]>([]);
  const [winType, setWinType] = useState<"ron" | "tsumo">("ron");
  const [riichi, setRiichi] = useState(false);
  const [doubleRiichi, setDoubleRiichi] = useState(false);
  const [ippatsu, setIppatsu] = useState(false);
  const [seatWind, setSeatWind] = useState<Wind>("east");
  const [roundWind, setRoundWind] = useState<Wind>("east");
  const [doraIndicator, setDoraIndicator] = useState("");
  const [uraDoraIndicator, setUraDoraIndicator] = useState("");
  const [scoreResult, setScoreResult] = useState<ScoreResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  function addTile(tile: string) {
    if (hand.length >= 14) return;
    setHand([...hand, tile]);
    setScoreResult(null);
  }

  function removeLast() { setHand(hand.slice(0, -1)); setScoreResult(null); }
  function clearHand() { setHand([]); setScoreResult(null); }

  async function handleScore() {
    setScoring(true);
    setScoreError(null);
    setScoreResult(null);
    try {
      const req: ScoreRequest = {
        closed_hand: hand,
        win_type: winType,
        riichi,
        double_riichi: doubleRiichi,
        ippatsu,
        seat_wind: seatWind,
        round_wind: roundWind,
        dora_indicators: doraIndicator ? [doraIndicator] : [],
        ura_dora_indicators: uraDoraIndicator ? [uraDoraIndicator] : [],
      };
      setScoreResult(await calculateScore(req));
    } catch (e) {
      const msg = String(e).replace("Error: ", "");
      setScoreError(msg === "역이 없습니다" ? NO_YAKU_HINT : msg);
    } finally {
      setScoring(false);
    }
  }

  const tileCount = hand.length;
  const canScore = tileCount === 13 || tileCount === 14;

  // Hand status message
  const handStatus =
    tileCount === 0 ? "아래 키보드로 패를 입력하세요"
    : tileCount < 13 ? `${13 - tileCount}장 더 입력하세요`
    : tileCount === 13 ? "13장 완성 — 론 화패를 포함한 상태입니다"
    : "14장 완성 — 쯔모 화료 상태입니다";

  function DoraSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex flex-wrap gap-1">
        {DORA_TILES.map((t) =>
          t === "" ? (
            <button key="none" onClick={() => onChange("")}
              className={`text-xs w-10 h-10 rounded border transition-colors ${value === "" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`}>
              없음
            </button>
          ) : (
            <button key={t} onClick={() => onChange(t === value ? "" : t)}
              className={`text-2xl w-10 h-10 rounded border transition-colors ${value === t ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`}
              title={t}>
              {tileEmoji(t)}
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-center">🀄 마작 점수 계산기</h1>

        {/* Hand display */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              <span>손패 ({tileCount}/14)</span>
              <div className="flex gap-2">
                <button onClick={removeLast} disabled={tileCount === 0}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-30">
                  ← 되돌리기
                </button>
                <button onClick={clearHand} disabled={tileCount === 0}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-30">
                  전체 삭제
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="min-h-14 flex flex-wrap gap-1 items-center">
              {hand.length === 0 ? (
                <p className="text-sm text-muted-foreground">아래 키보드로 패를 입력하세요</p>
              ) : (
                hand.map((tile, i) => (
                  <button key={i} onClick={() => setHand(hand.filter((_, j) => j !== i))}
                    className="text-2xl w-10 h-10 rounded border hover:border-destructive hover:bg-destructive/10 transition-colors"
                    title="클릭하면 제거">
                    {tileEmoji(tile)}
                  </button>
                ))
              )}
            </div>
            {/* Status */}
            <p className={`text-xs ${canScore ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
              {handStatus}
            </p>
          </CardContent>
        </Card>

        {/* Tile keyboard */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            {TILE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.tiles.map((tile) => (
                    <button key={tile} onClick={() => addTile(tile)} disabled={tileCount >= 14}
                      className="text-2xl w-10 h-10 rounded border border-muted hover:border-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-30"
                      title={tile}>
                      {tileEmoji(tile)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Options */}
        {tileCount >= 13 && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Win type */}
              <div className="flex gap-4">
                {(["ron", "tsumo"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="winType" checked={winType === type} onChange={() => setWinType(type)} />
                    <span className="font-medium">{type === "ron" ? "론 (다른 사람 패로 화료)" : "쯔모 (직접 뽑아서 화료)"}</span>
                  </label>
                ))}
              </div>

              {/* Riichi */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="riichi" checked={riichi} onCheckedChange={(v) => { setRiichi(!!v); if (!v) { setDoubleRiichi(false); setIppatsu(false); } }} />
                  <Label htmlFor="riichi">리치</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="double_riichi" checked={doubleRiichi} disabled={!riichi} onCheckedChange={(v) => setDoubleRiichi(!!v)} />
                  <Label htmlFor="double_riichi" className={!riichi ? "opacity-40" : ""}>더블 리치 <span className="text-xs text-muted-foreground">(첫 순에 리치)</span></Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ippatsu" checked={ippatsu} disabled={!riichi} onCheckedChange={(v) => setIppatsu(!!v)} />
                  <Label htmlFor="ippatsu" className={!riichi ? "opacity-40" : ""}>일발 <span className="text-xs text-muted-foreground">(리치 후 첫 순)</span></Label>
                </div>
              </div>

              {/* Winds */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">자풍 <span className="text-muted-foreground font-normal">(내 자리 바람)</span></Label>
                  <Select value={seatWind} onValueChange={(v) => setSeatWind(v as Wind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WINDS.map((w) => (
                        <SelectItem key={w} value={w}>{tileEmoji(w)} {WIND_LABEL[w]}가</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">장풍 <span className="text-muted-foreground font-normal">(현재 라운드)</span></Label>
                  <Select value={roundWind} onValueChange={(v) => setRoundWind(v as Wind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WINDS.map((w) => (
                        <SelectItem key={w} value={w}>{tileEmoji(w)} {WIND_LABEL[w]}장</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dora */}
              <div className="space-y-1">
                <Label className="text-xs">
                  도라 표시패{" "}
                  <span className="text-muted-foreground font-normal">— 표시패 다음 패가 도라입니다</span>
                </Label>
                <DoraSelector value={doraIndicator} onChange={setDoraIndicator} />
              </div>

              {riichi && (
                <div className="space-y-1">
                  <Label className="text-xs">우라도라 표시패</Label>
                  <DoraSelector value={uraDoraIndicator} onChange={setUraDoraIndicator} />
                </div>
              )}

              <Button onClick={handleScore} disabled={scoring || !canScore} className="w-full" size="lg">
                {scoring ? "계산 중..." : "점수 계산"}
              </Button>

              {scoreError && (
                <p className="text-sm text-destructive whitespace-pre-line">{scoreError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {scoreResult && <ScoreResult score={scoreResult} />}
      </div>
    </main>
  );
}
