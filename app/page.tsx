"use client";

import { useState } from "react";
import { calculateScore, ScoreRequest, ScoreResponse, MeldType, OpenMeld } from "@/lib/api";
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
const MELD_LABEL: Record<MeldType, string> = { chi: "치", pon: "퐁", kan_open: "열린깡", kan_closed: "암깡" };
const MELD_TILES_NEEDED: Record<MeldType, number> = { chi: 3, pon: 3, kan_open: 4, kan_closed: 4 };
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

const GUIDE_ITEMS = [
  {
    title: "패 표기법",
    content: "숫자 + 종류로 표기합니다.\n• 1m~9m : 만수패 (한자 패)\n• 1p~9p : 통수패 (원 패)\n• 1s~9s : 삭수패 (대나무 패)\n• east/south/west/north : 바람패, white/green/red : 삼원패",
  },
  {
    title: "론 vs 쯔모",
    content: "항상 14장(완성된 손패 전체)을 입력한 뒤 론/쯔모를 선택하세요.\n• 론: 다른 플레이어가 버린 패로 화료. 버린 패도 포함해 14장 입력.\n• 쯔모: 내가 직접 뽑은 패로 화료. 뽑은 패도 포함해 14장 입력.",
  },
  {
    title: "도라 표시패",
    content: "표시패 바로 다음 패가 도라(보너스)입니다.\n예) 표시패가 3만 → 도라는 4만\n예) 표시패가 9만 → 도라는 1만 (순환)\n예) 표시패가 북 → 도라는 동 (순환)",
  },
  {
    title: "자풍·장풍",
    content: "• 자풍: 내 자리의 바람. 동가=동, 남가=남, 서가=서, 북가=북.\n• 장풍: 현재 라운드. 동장이면 동, 남장이면 남.\n자풍·장풍에 해당하는 바람패 커쯔를 만들면 역패(1판)가 됩니다.",
  },
  {
    title: "역이 없으면 화료 불가",
    content: "완성된 손패라도 역이 하나 이상 있어야 점수 계산이 됩니다.\n역 없이 화료하려면: 리치, 탕야오(2~8번 패만), 역패(삼원패·자풍·장풍 커쯔) 등이 필요합니다.",
  },
];

type GameType = "none" | "east" | "half";

const GAME_MAX_HANDS: Record<GameType, number> = { none: 0, east: 4, half: 8 };
const GAME_LABEL: Record<GameType, string> = { none: "수동", east: "동풍전", half: "반장전" };

function deriveWinds(gameType: GameType, startSeat: Wind, handIndex: number): { seatWind: Wind; roundWind: Wind } {
  if (gameType === "none") return { seatWind: "east", roundWind: "east" };
  const startIdx = WINDS.indexOf(startSeat);
  const seatWind = WINDS[(startIdx - handIndex % 4 + 4) % 4];
  const roundWind = handIndex < 4 ? "east" : "south";
  return { seatWind, roundWind };
}

function handLabel(handIndex: number): string {
  const round = handIndex < 4 ? "동" : "남";
  const num = (handIndex % 4) + 1;
  return `${round}${num}국`;
}

export default function Home() {
  const [showGuide, setShowGuide] = useState(false);
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  // Game session
  const [gameType, setGameType] = useState<GameType>("none");
  const [startSeat, setStartSeat] = useState<Wind>("east");
  const [handIndex, setHandIndex] = useState(0);

  const [hand, setHand] = useState<string[]>([]);
  const [openMelds, setOpenMelds] = useState<OpenMeld[]>([]);
  const [addingMeldType, setAddingMeldType] = useState<MeldType | null>(null);
  const [meldTiles, setMeldTiles] = useState<string[]>([]);
  const [selectingMeldType, setSelectingMeldType] = useState(false);
  const [winType, setWinType] = useState<"ron" | "tsumo">("ron");
  const [riichi, setRiichi] = useState(false);
  const [doubleRiichi, setDoubleRiichi] = useState(false);
  const [ippatsu, setIppatsu] = useState(false);
  const [manualSeatWind, setManualSeatWind] = useState<Wind>("east");
  const [manualRoundWind, setManualRoundWind] = useState<Wind>("east");
  const [doraIndicator, setDoraIndicator] = useState("");
  const [uraDoraIndicator, setUraDoraIndicator] = useState("");
  const [scoreResult, setScoreResult] = useState<ScoreResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const isGameMode = gameType !== "none";
  const derived = deriveWinds(gameType, startSeat, handIndex);
  const seatWind = isGameMode ? derived.seatWind : manualSeatWind;
  const roundWind = isGameMode ? derived.roundWind : manualRoundWind;

  function changeGameType(type: GameType) {
    setGameType(type);
    setHandIndex(0);
    clearHand();
  }

  function nextHand() {
    setHandIndex((i) => Math.min(i + 1, GAME_MAX_HANDS[gameType] - 1));
    clearHand();
  }

  function prevHand() {
    setHandIndex((i) => Math.max(i - 1, 0));
    clearHand();
  }

  function tileOrder(tile: string): number {
    const suitOrder: Record<string, number> = { m: 0, p: 1, s: 2 };
    const honorOrder: Record<string, number> = { east: 0, south: 1, west: 2, north: 3, white: 4, green: 5, red: 6 };
    if (tile.endsWith("m") || tile.endsWith("p") || tile.endsWith("s")) {
      return suitOrder[tile.slice(-1)] * 100 + parseInt(tile.slice(0, -1));
    }
    return 300 + (honorOrder[tile] ?? 99);
  }

  const openMeldTileCount = openMelds.reduce((s, m) => s + m.tiles.length, 0);
  const isOpen = openMelds.some(m => m.type !== "kan_closed");
  const maxClosedTiles = 14 - openMeldTileCount;

  function addTile(tile: string) {
    if (addingMeldType) {
      const needed = MELD_TILES_NEEDED[addingMeldType];
      if (meldTiles.length >= needed) return;
      const next = [...meldTiles, tile];
      setMeldTiles(next);
      if (next.length === needed) {
        setOpenMelds([...openMelds, { type: addingMeldType, tiles: next }]);
        setHand(hand.slice(0, Math.min(hand.length, 14 - openMeldTileCount - needed)));
        setAddingMeldType(null);
        setMeldTiles([]);
        setScoreResult(null);
      }
      return;
    }
    if (hand.length >= maxClosedTiles) return;
    setHand([...hand, tile].sort((a, b) => tileOrder(a) - tileOrder(b)));
    setScoreResult(null);
  }

  function removeMeld(index: number) {
    setOpenMelds(openMelds.filter((_, i) => i !== index));
    setScoreResult(null);
  }

  function startMeld(type: MeldType) {
    setAddingMeldType(type);
    setMeldTiles([]);
    setSelectingMeldType(false);
  }

  function cancelMeld() {
    setAddingMeldType(null);
    setMeldTiles([]);
    setSelectingMeldType(false);
  }

  function removeLast() {
    if (addingMeldType) {
      setMeldTiles(meldTiles.slice(0, -1));
      return;
    }
    setHand(hand.slice(0, -1));
    setScoreResult(null);
  }
  function clearHand() {
    setHand([]);
    setOpenMelds([]);
    setAddingMeldType(null);
    setMeldTiles([]);
    setSelectingMeldType(false);
    setScoreResult(null);
  }

  async function handleScore() {
    setScoring(true);
    setScoreError(null);
    setScoreResult(null);
    try {
      const req: ScoreRequest = {
        closed_hand: hand,
        open_melds: openMelds.length > 0 ? openMelds : undefined,
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
  const totalTiles = tileCount + openMeldTileCount;
  const canScore = totalTiles === 14;

  // Hand status message
  const handStatus = addingMeldType
    ? `${MELD_LABEL[addingMeldType]} 입력 중 — ${meldTiles.length}/${MELD_TILES_NEEDED[addingMeldType]}장`
    : totalTiles === 0 ? "아래 키보드로 패를 입력하세요"
    : totalTiles < 14 ? `${14 - totalTiles}장 더 입력하세요`
    : "14장 완성 — 론/쯔모를 선택하세요";

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
        <div className="text-center space-y-1 py-2">
          <h1 className="text-2xl font-bold tracking-tight">🀄 마작 점수 계산기</h1>
          <p className="text-sm text-muted-foreground">Riichi Mahjong Score Calculator</p>
        </div>

        {/* 초보자 가이드 */}
        <div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full text-sm text-muted-foreground border rounded-lg px-4 py-2 hover:bg-muted transition-colors flex justify-between items-center"
          >
            <span>처음 사용하시나요? 도움말 보기</span>
            <span>{showGuide ? "▲" : "▼"}</span>
          </button>
          {showGuide && (
            <div className="mt-2 border rounded-lg divide-y overflow-hidden">
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenGuide(openGuide === i ? null : i)}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-muted transition-colors flex justify-between items-center"
                  >
                    <span>{item.title}</span>
                    <span className="text-muted-foreground">{openGuide === i ? "−" : "+"}</span>
                  </button>
                  {openGuide === i && (
                    <p className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game session */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              {(["none", "east", "half"] as GameType[]).map((type) => (
                <button key={type} onClick={() => changeGameType(type)}
                  className={`flex-1 py-1.5 text-sm rounded border transition-colors ${gameType === type ? "border-primary bg-primary/10 font-medium" : "border-muted hover:border-primary/50"}`}>
                  {GAME_LABEL[type]}
                </button>
              ))}
            </div>

            {isGameMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">시작 자리</span>
                  {WINDS.map((w) => (
                    <button key={w} onClick={() => { setStartSeat(w); setHandIndex(0); }}
                      className={`text-sm px-2 py-1 rounded border transition-colors ${startSeat === w ? "border-primary bg-primary/10 font-medium" : "border-muted hover:border-primary/50"}`}>
                      {tileEmoji(w)} {WIND_LABEL[w]}가
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={prevHand} disabled={handIndex === 0}
                    className="text-sm px-3 py-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors">
                    ← 이전 판
                  </button>
                  <div className="text-center">
                    <p className="font-semibold">{handLabel(handIndex)}</p>
                    <p className="text-xs text-muted-foreground">
                      장풍 {tileEmoji(roundWind)}{WIND_LABEL[roundWind]} · 자풍 {tileEmoji(seatWind)}{WIND_LABEL[seatWind]}가
                    </p>
                  </div>
                  <button onClick={nextHand} disabled={handIndex >= GAME_MAX_HANDS[gameType] - 1}
                    className="text-sm px-3 py-1 rounded border hover:bg-muted disabled:opacity-30 transition-colors">
                    다음 판 →
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hand display */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              <span>손패 ({totalTiles}/14)</span>
              <div className="flex gap-2">
                <button onClick={removeLast} disabled={tileCount === 0 && meldTiles.length === 0}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-30">
                  ← 되돌리기
                </button>
                <button onClick={clearHand} disabled={totalTiles === 0}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-30">
                  전체 삭제
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="min-h-14 flex flex-wrap gap-1 items-center">
              {hand.length === 0 && openMelds.length === 0 ? (
                <p className="text-sm text-muted-foreground">아래 키보드로 패를 입력하세요</p>
              ) : (
                <>
                  {hand.map((tile, i) => (
                    <button key={i} onClick={() => { setHand(hand.filter((_, j) => j !== i)); setScoreResult(null); }}
                      className="text-3xl w-11 h-11 rounded border hover:border-destructive hover:bg-destructive/10 transition-colors"
                      title="클릭하면 제거">
                      {tileEmoji(tile)}
                    </button>
                  ))}
                  {openMelds.length > 0 && (
                    <div className="w-full flex flex-wrap gap-2 mt-1 pt-1 border-t">
                      {openMelds.map((meld, i) => (
                        <div key={i} className="flex items-center gap-0.5 bg-muted rounded px-1 py-0.5">
                          <span className="text-xs text-muted-foreground mr-1">{MELD_LABEL[meld.type]}</span>
                          {meld.tiles.map((t, j) => (
                            <span key={j} className="text-2xl">{tileEmoji(t)}</span>
                          ))}
                          <button onClick={() => removeMeld(i)}
                            className="ml-1 text-xs text-muted-foreground hover:text-destructive">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {addingMeldType && meldTiles.length > 0 && (
                    <div className="w-full flex items-center gap-0.5 mt-1 pt-1 border-t border-dashed">
                      <span className="text-xs text-muted-foreground mr-1">{MELD_LABEL[addingMeldType]} 입력 중</span>
                      {meldTiles.map((t, j) => (
                        <span key={j} className="text-2xl">{tileEmoji(t)}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 울기 컨트롤 */}
            {!addingMeldType && !selectingMeldType && openMelds.length < 4 && (
              <button onClick={() => setSelectingMeldType(true)}
                className="text-xs px-3 py-1 rounded border border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors">
                + 울기 추가 (치/퐁/깡)
              </button>
            )}
            {selectingMeldType && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-muted-foreground">종류:</span>
                {(["chi", "pon", "kan_open", "kan_closed"] as MeldType[]).map(type => (
                  <button key={type} onClick={() => startMeld(type)}
                    className="text-xs px-2 py-1 rounded border hover:border-primary hover:bg-primary/10 transition-colors">
                    {MELD_LABEL[type]}
                  </button>
                ))}
                <button onClick={cancelMeld}
                  className="text-xs px-2 py-1 rounded border border-muted hover:bg-muted transition-colors">
                  취소
                </button>
              </div>
            )}
            {addingMeldType && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-medium">
                  {MELD_LABEL[addingMeldType]} 타일 선택 ({meldTiles.length}/{MELD_TILES_NEEDED[addingMeldType]})
                </span>
                <button onClick={cancelMeld}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-muted transition-colors">
                  취소
                </button>
              </div>
            )}
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
                    <button key={tile} onClick={() => addTile(tile)} disabled={!addingMeldType && tileCount >= maxClosedTiles}
                      className="text-3xl w-11 h-11 rounded border border-muted hover:border-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-30"
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
        {canScore && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Win type */}
              <div className="flex gap-4">
                {(["ron", "tsumo"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="winType" checked={winType === type} onChange={() => setWinType(type)} />
                    <span className="font-medium">{type === "ron" ? "론 (버린 패)" : "쯔모 (뽑은 패)"}</span>
                  </label>
                ))}
              </div>

              {/* Riichi — 열린 손패에서는 불가 */}
              {isOpen && (
                <p className="text-xs text-muted-foreground">울었을 때: 리치·멘젠쯔모·핀후·이페코 불가</p>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="riichi" checked={riichi} disabled={isOpen} onCheckedChange={(v) => { setRiichi(!!v); if (!v) { setDoubleRiichi(false); setIppatsu(false); } }} />
                  <Label htmlFor="riichi" className={isOpen ? "opacity-40" : ""}>리치</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="double_riichi" checked={doubleRiichi} disabled={!riichi || isOpen} onCheckedChange={(v) => setDoubleRiichi(!!v)} />
                  <Label htmlFor="double_riichi" className={!riichi || isOpen ? "opacity-40" : ""}>더블 리치</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ippatsu" checked={ippatsu} disabled={!riichi} onCheckedChange={(v) => setIppatsu(!!v)} />
                  <Label htmlFor="ippatsu" className={!riichi ? "opacity-40" : ""}>일발</Label>
                </div>
              </div>

              {/* Winds */}
              {isGameMode ? (
                <p className="text-sm text-muted-foreground">
                  장풍 {tileEmoji(roundWind)}{WIND_LABEL[roundWind]}장 · 자풍 {tileEmoji(seatWind)}{WIND_LABEL[seatWind]}가
                  <span className="text-xs ml-1">(위 게임 설정에서 자동)</span>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">자풍 <span className="text-muted-foreground font-normal">(내 자리 바람)</span></Label>
                    <Select value={manualSeatWind} onValueChange={(v) => setManualSeatWind(v as Wind)}>
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
                    <Select value={manualRoundWind} onValueChange={(v) => setManualRoundWind(v as Wind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WINDS.map((w) => (
                          <SelectItem key={w} value={w}>{tileEmoji(w)} {WIND_LABEL[w]}장</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

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

        {scoreResult && <ScoreResult score={scoreResult} seatWind={seatWind} winType={winType} />}
      </div>
    </main>
  );
}
