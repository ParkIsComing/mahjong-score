// Mahjong scoring engine (TypeScript port of scoring.py)

export type WinType = "ron" | "tsumo";
export type Wind = "east" | "south" | "west" | "north";
export type MeldType = "chi" | "pon" | "kan_open" | "kan_closed";

export interface OpenMeld {
  type: MeldType;
  tiles: string[]; // 3 for chi/pon, 4 for kan
}

export interface ScoreRequest {
  closed_hand: string[];
  open_melds?: OpenMeld[];
  win_type: WinType;
  riichi?: boolean;
  double_riichi?: boolean;
  ippatsu?: boolean;
  seat_wind?: Wind;
  round_wind?: Wind;
  dora_indicators?: string[];
  ura_dora_indicators?: string[];
}

export interface Yaku {
  name: string;
  han: number;
}

export interface ScoreResult {
  ron?: number;
  tsumo_dealer?: number;
  tsumo_non_dealer?: number;
}

export interface ScoreResponse {
  han: number;
  fu: number;
  yaku: Yaku[];
  result: ScoreResult;
  is_yakuman: boolean;
}

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------

const WINDS: Wind[] = ["east", "south", "west", "north"];
const DRAGONS = ["white", "green", "red"];
const HONORS = [...WINDS, ...DRAGONS];
const TERMINALS_SUITS = ["1m", "9m", "1p", "9p", "1s", "9s"];
const TERMINALS = [...TERMINALS_SUITS, ...HONORS];
const GREEN_TILES = new Set(["2s", "3s", "4s", "6s", "8s", "green"]);

function isHonor(tile: string): boolean {
  return HONORS.includes(tile);
}

function isTerminalOrHonor(tile: string): boolean {
  return TERMINALS.includes(tile);
}

function isSimple(tile: string): boolean {
  return !isTerminalOrHonor(tile);
}

function tSuit(tile: string): string | null {
  if (tile.endsWith("m")) return "m";
  if (tile.endsWith("p")) return "p";
  if (tile.endsWith("s")) return "s";
  return null;
}

function tNumber(tile: string): number | null {
  const s = tSuit(tile);
  return s ? parseInt(tile.slice(0, -1)) : null;
}

function doraOf(indicator: string): string {
  if (WINDS.includes(indicator as Wind)) {
    return WINDS[(WINDS.indexOf(indicator as Wind) + 1) % 4];
  }
  if (DRAGONS.includes(indicator)) {
    return DRAGONS[(DRAGONS.indexOf(indicator) + 1) % 3];
  }
  const n = tNumber(indicator)!;
  const s = tSuit(indicator)!;
  return n === 9 ? `1${s}` : `${n + 1}${s}`;
}

function countDora(tiles: string[], indicators: string[]): number {
  const doras = indicators.map(doraOf);
  return doras.reduce((sum, d) => sum + tiles.filter(t => t === d).length, 0);
}

// ---------------------------------------------------------------------------
// Hand decomposition
// ---------------------------------------------------------------------------

type Group = ["seq", string, string, string] | ["tri", string, string, string] | ["pair", string, string];

function decompose(tiles: string[]): Group[][] {
  const results: Group[][] = [];
  _decomposeRecursive([...tiles].sort(), [], results);
  const seen = new Set<string>();
  return results.filter(d => {
    const key = [...d].map(g => g.join(",")).sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function _decomposeRecursive(tiles: string[], groups: Group[], results: Group[][]): void {
  if (tiles.length === 0) {
    if (groups.filter(g => g[0] === "pair").length === 1) {
      results.push([...groups]);
    }
    return;
  }

  const t = tiles[0];
  const rest = tiles.slice(1);

  // Triplet
  if (rest.filter(x => x === t).length >= 2) {
    const newRest = [...rest];
    newRest.splice(newRest.indexOf(t), 1);
    newRest.splice(newRest.indexOf(t), 1);
    _decomposeRecursive(newRest, [...groups, ["tri", t, t, t]], results);
  }

  // Sequence
  const s = tSuit(t);
  const n = tNumber(t);
  if (s && n && n <= 7) {
    const t2 = `${n + 1}${s}`;
    const t3 = `${n + 2}${s}`;
    const restCopy = [...rest];
    const i2 = restCopy.indexOf(t2);
    if (i2 !== -1) {
      restCopy.splice(i2, 1);
      const i3 = restCopy.indexOf(t3);
      if (i3 !== -1) {
        restCopy.splice(i3, 1);
        _decomposeRecursive(restCopy, [...groups, ["seq", t, t2, t3]], results);
      }
    }
  }

  // Pair (only one allowed)
  if (!groups.some(g => g[0] === "pair") && rest.includes(t)) {
    const newRest = [...rest];
    newRest.splice(newRest.indexOf(t), 1);
    _decomposeRecursive(newRest, [...groups, ["pair", t, t]], results);
  }
}

function isChiitoi(tiles: string[]): boolean {
  const counts = new Map<string, number>();
  for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
  return tiles.length === 14 && [...counts.values()].filter(c => c >= 2).length === 7;
}

function isKokushi(tiles: string[]): boolean {
  const required = ["1m","9m","1p","9p","1s","9s","east","south","west","north","white","green","red"];
  const tileSet = new Set(tiles);
  return required.every(t => tileSet.has(t)) && required.some(t => tiles.filter(x => x === t).length >= 2);
}

function isChuuren(tiles: string[]): boolean {
  const s = tSuit(tiles[0]);
  if (!s || !tiles.every(t => tSuit(t) === s)) return false;
  const counts = new Map<string, number>();
  for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
  const base: Record<string, number> = { [`1${s}`]: 3, [`9${s}`]: 3 };
  for (let i = 2; i <= 8; i++) base[`${i}${s}`] = 1;
  return Object.entries(base).every(([tile, needed]) => (counts.get(tile) ?? 0) >= needed);
}

// ---------------------------------------------------------------------------
// Yakuman detection
// ---------------------------------------------------------------------------

function detectYakuman(
  decompositions: Group[][],
  openGroups: Group[],
  closedTiles: string[],
  allTiles: string[],
  req: ScoreRequest,
  isOpen: boolean
): [string, number][] | null {
  // Kokushi and Chuuren require closed hand only
  if (!isOpen) {
    if (isKokushi(closedTiles)) return [["kokushi", 13]];
    if (isChuuren(closedTiles)) return [["chuuren", 13]];
  }

  const kanCount = (req.open_melds ?? []).filter(m => m.type === "kan_open" || m.type === "kan_closed").length;

  for (const decomp of decompositions) {
    const allGroups = [...decomp, ...openGroups];
    const tris = allGroups.filter(g => g[0] === "tri");
    const pair = allGroups.find(g => g[0] === "pair");
    const closedTris = decomp.filter(g => g[0] === "tri");
    const results: [string, number][] = [];

    // 사깡자: 깡 4개 (역만)
    if (kanCount === 4) results.push(["suukantsu", 13]);

    // Suuankou: all 4 triplets must be closed
    if (!isOpen && closedTris.length === 4) results.push(["suuankou", 13]);

    const dragonTris = tris.filter(g => DRAGONS.includes(g[1]));
    if (dragonTris.length === 3) results.push(["daisangen", 13]);

    const windTris = tris.filter(g => WINDS.includes(g[1] as Wind));
    if (windTris.length === 4) results.push(["daisuushii", 13]);
    else if (windTris.length === 3 && pair && WINDS.includes(pair[1] as Wind)) results.push(["shousuushii", 13]);

    if (allTiles.every(t => isHonor(t))) results.push(["tsuuiisou", 13]);
    if (allTiles.every(t => TERMINALS_SUITS.includes(t))) results.push(["chinroutou", 13]);
    if (allTiles.every(t => GREEN_TILES.has(t))) results.push(["ryuuiisou", 13]);

    if (results.length > 0) {
      return [...new Map(results).entries()];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Standard yaku detection
// ---------------------------------------------------------------------------

function isYakuhai(tile: string, req: ScoreRequest): boolean {
  return DRAGONS.includes(tile) || tile === (req.seat_wind ?? "east") || tile === (req.round_wind ?? "east");
}

function groupHasTerminalOrHonor(group: Group): boolean {
  return group.slice(1).some(t => isTerminalOrHonor(t as string));
}

function groupHasSuitTerminal(group: Group): boolean {
  return group.slice(1).some(t => TERMINALS_SUITS.includes(t as string));
}

function chiitoiYaku(req: ScoreRequest): [string, number][] {
  const yaku: [string, number][] = [["chiitoi", 2]];
  if (req.double_riichi) yaku.push(["double_riichi", 2]);
  else if (req.riichi) yaku.push(["riichi", 1]);
  if (req.ippatsu) yaku.push(["ippatsu", 1]);
  if (req.win_type === "tsumo") yaku.push(["tsumo", 1]);
  return yaku;
}

function standardYaku(
  decomp: Group[],
  openGroups: Group[],
  closedTiles: string[],
  allTiles: string[],
  req: ScoreRequest,
  isOpen: boolean
): [string, number][] {
  const yaku: [string, number][] = [];
  const allGroups = [...decomp, ...openGroups];
  const seqs = allGroups.filter(g => g[0] === "seq");
  const tris = allGroups.filter(g => g[0] === "tri");
  const pair = allGroups.find(g => g[0] === "pair")!;
  const closedTris = decomp.filter(g => g[0] === "tri");

  // Riichi (closed only)
  if (!isOpen) {
    if (req.double_riichi) yaku.push(["double_riichi", 2]);
    else if (req.riichi) yaku.push(["riichi", 1]);
    if (req.ippatsu) yaku.push(["ippatsu", 1]);
  }

  // 멘젠쯔모 (closed tsumo only)
  if (req.win_type === "tsumo" && !isOpen) yaku.push(["tsumo", 1]);

  // 탕야오 (all tiles must be simples)
  if (allTiles.every(isSimple)) yaku.push(["tanyao", 1]);

  // 핀후 (closed only)
  if (!isOpen && seqs.length === 4 && !isYakuhai(pair[1], req)) yaku.push(["pinfu", 1]);

  // 이페코 / 량페코 (closed only)
  if (!isOpen) {
    const seqKeys = seqs.map(g => [g[1], g[2], g[3]].sort().join(","));
    const seqCounts = new Map<string, number>();
    for (const k of seqKeys) seqCounts.set(k, (seqCounts.get(k) ?? 0) + 1);
    const dupPairs = [...seqCounts.values()].filter(c => c >= 2).length;
    if (dupPairs === 2) yaku.push(["ryanpeikou", 3]);
    else if (dupPairs === 1) yaku.push(["iipeiko", 1]);
  }

  // 역패
  for (const tri of tris) {
    if (isYakuhai(tri[1], req)) yaku.push(["yakuhai", 1]);
  }

  // 소삼원
  const dragonTris = tris.filter(g => DRAGONS.includes(g[1]));
  if (dragonTris.length === 2 && DRAGONS.includes(pair[1])) yaku.push(["shousangen", 2]);

  // 토이토이
  if (tris.length === 4) yaku.push(["toitoi", 2]);

  // 산안코: 닫힌 커쯔 정확히 3개
  if (closedTris.length === 3) yaku.push(["sanankou", 2]);

  // 산깡자: 깡 3개
  const kanCount = (req.open_melds ?? []).filter(m => m.type === "kan_open" || m.type === "kan_closed").length;
  if (kanCount === 3) yaku.push(["sankantsu", 2]);

  // 준찬타 / 찬타 (열린 손패: 한 수 감소)
  const hasSeq = seqs.length > 0;
  if (hasSeq && allGroups.every(groupHasSuitTerminal)) {
    yaku.push(["junchan", isOpen ? 2 : 3]);
  } else if (hasSeq && allGroups.every(groupHasTerminalOrHonor)) {
    yaku.push(["chanta", isOpen ? 1 : 2]);
  }

  // 산쇼쿠 도우준 (열린 손패: 1판)
  const seqStartsBySuit: Record<string, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const g of seqs) {
    const suit = tSuit(g[1]);
    const num = tNumber(g[1]);
    if (suit && num) seqStartsBySuit[suit].add(num);
  }
  const commonSeq = [...seqStartsBySuit.m].filter(n => seqStartsBySuit.p.has(n) && seqStartsBySuit.s.has(n));
  if (commonSeq.length > 0) yaku.push(["sanshoku_doujun", isOpen ? 1 : 2]);

  // 산쇼쿠 도우코 (열린 손패도 2판)
  const triNumsBySuit: Record<string, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const g of tris) {
    const suit = tSuit(g[1]);
    const num = tNumber(g[1]);
    if (suit && num) triNumsBySuit[suit].add(num);
  }
  const commonTri = [...triNumsBySuit.m].filter(n => triNumsBySuit.p.has(n) && triNumsBySuit.s.has(n));
  if (commonTri.length > 0) yaku.push(["sanshoku_doukou", 2]);

  // 잇쑤 (열린 손패: 1판)
  for (const suit of ["m", "p", "s"]) {
    const starts = new Set(seqs.filter(g => tSuit(g[1]) === suit).map(g => tNumber(g[1])!));
    if ([1, 4, 7].every(n => starts.has(n))) { yaku.push(["ittsu", isOpen ? 1 : 2]); break; }
  }

  // 혼이쯔 / 칭이쯔 (열린 손패: 1판 감소)
  const nonHonorSuits = new Set(allTiles.filter(t => !isHonor(t)).map(tSuit).filter(Boolean));
  const hasHonors = allTiles.some(isHonor);
  if (nonHonorSuits.size === 1) {
    yaku.push(hasHonors ? ["honitsu", isOpen ? 2 : 3] : ["chinitsu", isOpen ? 5 : 6]);
  }

  return yaku;
}

function detectYaku(
  decompositions: Group[][],
  openGroups: Group[],
  closedTiles: string[],
  allTiles: string[],
  req: ScoreRequest,
  isOpen: boolean
): [string, number][] {
  const yakuman = detectYakuman(decompositions, openGroups, closedTiles, allTiles, req, isOpen);
  if (yakuman) return yakuman;

  if (isChiitoi(allTiles)) return chiitoiYaku(req);

  let best: [string, number][] = [];
  for (const decomp of decompositions) {
    const y = standardYaku(decomp, openGroups, closedTiles, allTiles, req, isOpen);
    if (y.reduce((s, [, h]) => s + h, 0) > best.reduce((s, [, h]) => s + h, 0)) best = y;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Fu calculation
// ---------------------------------------------------------------------------

function calculateFu(decomp: Group[], openMelds: OpenMeld[], req: ScoreRequest, isOpen: boolean): number {
  // Base fu
  let fu: number;
  if (isOpen) {
    fu = 20;
    if (req.win_type === "tsumo") fu += 2; // tsumo bonus (pinfu impossible when open)
  } else {
    fu = req.win_type === "ron" ? 30 : 20;
  }

  // Closed hand groups
  for (const group of decomp) {
    const kind = group[0];
    const tile = group[1];
    if (kind === "pair") {
      if (isYakuhai(tile, req) || TERMINALS_SUITS.includes(tile) || isHonor(tile)) fu += 4;
    } else if (kind === "tri") {
      fu += isTerminalOrHonor(tile) ? 8 : 4;
    }
  }

  // Open meld fu
  for (const meld of openMelds) {
    const tile = meld.tiles[0];
    if (meld.type === "pon") {
      fu += isTerminalOrHonor(tile) ? 4 : 2;
    } else if (meld.type === "kan_open") {
      fu += isTerminalOrHonor(tile) ? 16 : 8;
    } else if (meld.type === "kan_closed") {
      fu += isTerminalOrHonor(tile) ? 32 : 16;
    }
    // chi: 0 fu
  }

  return Math.ceil(fu / 10) * 10;
}

// ---------------------------------------------------------------------------
// Points table
// ---------------------------------------------------------------------------

const SCORE_TABLE: Record<string, [number, number, number]> = {
  "1,30": [1000, 500, 300], "1,40": [1300, 700, 400], "1,50": [1600, 800, 400],
  "1,60": [2000, 1000, 500], "1,70": [2300, 1200, 600], "1,80": [2600, 1300, 700],
  "1,90": [2900, 1500, 800], "1,100": [3200, 1600, 800], "1,110": [3600, 1800, 900],
  "2,20": [1300, 700, 400], "2,30": [2000, 1000, 500], "2,40": [2600, 1300, 700],
  "2,50": [3200, 1600, 800], "2,60": [3900, 2000, 1000], "2,70": [4500, 2300, 1200],
  "2,80": [5200, 2600, 1300], "2,90": [5800, 2900, 1500], "2,100": [6400, 3200, 1600],
  "2,110": [7100, 3600, 1800],
  "3,20": [2600, 1300, 700], "3,30": [3900, 2000, 1000], "3,40": [5200, 2600, 1300],
  "3,50": [6400, 3200, 1600], "3,60": [7700, 3900, 2000],
  "4,20": [5200, 2600, 1300], "4,25": [6400, 3200, 1600], "4,30": [7700, 3900, 2000],
};

function round100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

function calculatePoints(han: number, fu: number, isDealer: boolean): ScoreResult {
  if (han >= 13) {
    const b = isDealer ? 48000 : 32000;
    return { ron: b, tsumo_dealer: round100(b / 3), tsumo_non_dealer: round100(b / 3) };
  }
  if (han >= 11) {
    const b = isDealer ? 36000 : 24000;
    return { ron: b, tsumo_dealer: round100(b / 3), tsumo_non_dealer: round100(b / 3) };
  }
  if (han >= 8) {
    const b = isDealer ? 24000 : 16000;
    return { ron: b, tsumo_dealer: round100(b / 3), tsumo_non_dealer: round100(b / 3) };
  }
  if (han >= 6) {
    const b = isDealer ? 18000 : 12000;
    return { ron: b, tsumo_dealer: round100(b / 3), tsumo_non_dealer: round100(b / 3) };
  }
  if (han >= 5 || (han === 4 && fu >= 30) || (han === 3 && fu >= 70)) {
    const b = isDealer ? 12000 : 8000;
    return { ron: b, tsumo_dealer: isDealer ? 4000 : 4000, tsumo_non_dealer: isDealer ? 4000 : 2000 };
  }

  const key = `${han},${fu}`;
  if (SCORE_TABLE[key]) {
    const [ron, tsumoD, tsumoND] = SCORE_TABLE[key];
    if (isDealer) {
      return { ron: round100(ron * 1.5), tsumo_dealer: tsumoD, tsumo_non_dealer: tsumoD };
    }
    return { ron, tsumo_dealer: tsumoD, tsumo_non_dealer: tsumoND };
  }

  const basic = fu * Math.pow(2, han + 2);
  return {
    ron: round100(basic * 4),
    tsumo_dealer: round100(basic * 2),
    tsumo_non_dealer: round100(basic),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function calculateScore(req: ScoreRequest): ScoreResponse {
  const closedTiles = req.closed_hand;
  const openMelds = req.open_melds ?? [];
  const allTiles = [...closedTiles, ...openMelds.flatMap(m => m.tiles)];

  // isOpen: has any non-closed-kan melds (closed kans don't break menzen)
  const isOpen = openMelds.some(m => m.type !== "kan_closed");
  const isRiichi = !isOpen && (req.riichi || req.double_riichi);

  const doraCount = countDora(allTiles, req.dora_indicators ?? []);
  const uraCount = isRiichi ? countDora(allTiles, req.ura_dora_indicators ?? []) : 0;

  // Convert open melds to Group[] (kans treated as tri for yaku purposes)
  const openGroups: Group[] = openMelds.map(m =>
    m.type === "chi"
      ? ["seq", m.tiles[0], m.tiles[1], m.tiles[2]]
      : ["tri", m.tiles[0], m.tiles[1], m.tiles[2]]
  );

  const decompositions = decompose(closedTiles);
  const yakuList = detectYaku(decompositions, openGroups, closedTiles, allTiles, req, isOpen);

  if (yakuList.length === 0) throw new Error("역이 없습니다");

  if (doraCount > 0) yakuList.push(["dora", doraCount]);
  if (uraCount > 0) yakuList.push(["ura_dora", uraCount]);

  const han = yakuList.reduce((s, [, h]) => s + h, 0);
  const isYakuman = han >= 13;

  let fu: number;
  if (isChiitoi(allTiles)) {
    fu = 25;
  } else if (decompositions.length > 0) {
    fu = calculateFu(decompositions[0], openMelds, req, isOpen);
  } else {
    fu = 30;
  }

  const isDealer = (req.seat_wind ?? "east") === "east";
  const result = calculatePoints(han, fu, isDealer);

  return {
    han,
    fu,
    yaku: yakuList.map(([name, h]) => ({ name, han: h })),
    result,
    is_yakuman: isYakuman,
  };
}
