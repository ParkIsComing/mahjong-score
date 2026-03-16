export type MeldType = "chi" | "pon" | "kan_open" | "kan_closed";

export interface OpenMeld {
  type: MeldType;
  tiles: string[];
}

export interface ScoreRequest {
  closed_hand: string[];
  open_melds?: OpenMeld[];
  win_type: "ron" | "tsumo";
  riichi: boolean;
  double_riichi: boolean;
  ippatsu: boolean;
  seat_wind: "east" | "south" | "west" | "north";
  round_wind: "east" | "south" | "west" | "north";
  dora_indicators: string[];
  ura_dora_indicators: string[];
}

export interface Yaku {
  name: string;
  han: number;
}

export interface ScoreResponse {
  han: number;
  fu: number;
  yaku: Yaku[];
  result: {
    ron?: number;
    tsumo_dealer?: number;
    tsumo_non_dealer?: number;
  };
  is_yakuman: boolean;
}

export async function calculateScore(req: ScoreRequest): Promise<ScoreResponse> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "점수 계산 실패");
  }
  return res.json();
}
