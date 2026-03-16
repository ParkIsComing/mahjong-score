"use client";

import { ScoreResponse } from "@/lib/api";
import { yakuDisplayName } from "@/lib/tiles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Wind = "east" | "south" | "west" | "north";
type WinType = "ron" | "tsumo";

const WIND_LABEL: Record<Wind, string> = { east: "동", south: "남", west: "서", north: "북" };

interface ScoreResultProps {
  score: ScoreResponse;
  seatWind: Wind;
  winType: WinType;
}

export function ScoreResult({ score, seatWind, winType }: ScoreResultProps) {
  const { han, fu, yaku, result, is_yakuman } = score;
  const isDealer = seatWind === "east";

  // 테이블 배치: 자풍에 따라 각 플레이어의 상대 위치 결정
  const getPlayerPositions = () => {
    const positions: Record<Wind, Record<string, string>> = {
      east: { you: "동(나)", left: "서", right: "남", opposite: "북" },
      south: { you: "남(나)", left: "동", right: "서", opposite: "북" },
      west: { you: "서(나)", left: "북", right: "동", opposite: "남" },
      north: { you: "북(나)", left: "서", right: "동", opposite: "남" },
    };
    return positions[seatWind];
  };

  const players = getPlayerPositions();

  // 론 설명
  const getRonExplanation = () => {
    return `버린 사람으로부터 ${result.ron?.toLocaleString()}점을 받습니다`;
  };

  // 쯔모 설명
  const getTsumoExplanation = () => {
    const totalPoints = (result.tsumo_dealer || 0) + (result.tsumo_non_dealer || 0) * 2;
    if (isDealer) {
      return `비딜러 3명이 각각 ${result.tsumo_dealer?.toLocaleString()}점씩 (총 ${totalPoints?.toLocaleString()}점)`;
    } else {
      return `딜러에게 ${result.tsumo_dealer?.toLocaleString()}점, 비딜러 2명에게 각각 ${result.tsumo_non_dealer?.toLocaleString()}점`;
    }
  };

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">
          {is_yakuman ? (
            <span className="text-yellow-500 font-bold">역만!</span>
          ) : (
            <span>
              {han}한 {fu}부
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Yaku list */}
        <div className="flex flex-wrap gap-2">
          {yaku.map((y, i) => (
            <Badge key={i} variant="secondary" className="text-sm">
              {yakuDisplayName(y.name)}
              {y.han > 0 && (
                <span className="ml-1 opacity-60">{y.han}한</span>
              )}
            </Badge>
          ))}
        </div>

        {/* Points display */}
        <div className="grid grid-cols-2 gap-3">
          {result.ron !== undefined && (
            <div className={`rounded-lg p-3 text-center ${winType === "ron" ? "bg-red-100 dark:bg-red-900 border-2 border-red-500" : "bg-red-50 dark:bg-red-950"}`}>
              <p className="text-xs text-muted-foreground mb-1">론</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {result.ron.toLocaleString()}점
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getRonExplanation()}</p>
            </div>
          )}
          {result.tsumo_dealer !== undefined && (
            <div className={`rounded-lg p-3 text-center ${winType === "tsumo" ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500" : "bg-blue-50 dark:bg-blue-950"}`}>
              <p className="text-xs text-muted-foreground mb-1">쯔모</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {isDealer
                  ? ((result.tsumo_dealer || 0) * 3).toLocaleString()
                  : ((result.tsumo_dealer || 0) + (result.tsumo_non_dealer || 0) * 2).toLocaleString()}점
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getTsumoExplanation()}</p>
            </div>
          )}
        </div>

        {/* Mahjong table visualization */}
        <div className="flex justify-center pt-2">
          <svg width="280" height="280" viewBox="0 0 280 280" className="drop-shadow-sm">
            {/* Background */}
            <rect x="10" y="10" width="260" height="260" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2" rx="4" />

            {/* Diamond shape (마름모) */}
            <polygon points="140,20 220,140 140,260 60,140" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />

            {/* Top player (당신) */}
            <g>
              <circle cx="140" cy="30" r="18" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
              <text x="140" y="35" textAnchor="middle" className="text-sm font-bold" fill="currentColor">
                {players.you}
              </text>
            </g>

            {/* Left player */}
            <g>
              <circle cx="30" cy="140" r="18" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
              <text x="30" y="145" textAnchor="middle" className="text-xs" fill="currentColor">
                {players.left}
              </text>
            </g>

            {/* Right player */}
            <g>
              <circle cx="250" cy="140" r="18" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
              <text x="250" y="145" textAnchor="middle" className="text-xs" fill="currentColor">
                {players.right}
              </text>
            </g>

            {/* Bottom player */}
            <g>
              <circle cx="140" cy="250" r="18" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
              <text x="140" y="255" textAnchor="middle" className="text-xs" fill="currentColor">
                {players.opposite}
              </text>
            </g>

            {/* Center info box */}
            <rect x="100" y="110" width="80" height="60" fill="white" stroke="currentColor" strokeWidth="1" rx="4" opacity="0.9" />
            <text x="140" y="130" textAnchor="middle" className="text-sm font-bold" fill="currentColor">
              {winType === "ron" ? "론" : "쯔모"}
            </text>
            <text x="140" y="152" textAnchor="middle" className="text-lg font-bold" fill="#ef4444">
              {winType === "ron"
                ? result.ron?.toLocaleString()
                : isDealer
                ? ((result.tsumo_dealer || 0) * 3).toLocaleString()
                : ((result.tsumo_dealer || 0) + (result.tsumo_non_dealer || 0) * 2).toLocaleString()}
            </text>

            {/* Arrows — 항상 당신(위, 140,30)을 향함 */}
            <defs>
              <marker id="arrow-ron" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
              <marker id="arrow-tsumo" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* 론: 버린 사람 미상 — 화살표 없이 물음표만 */}
            {winType === "ron" && (
              <text x="140" y="220" textAnchor="middle" fontSize="28" fill="#ef4444" opacity="0.5">?</text>
            )}

            {/* 쯔모: 3명 모두 당신에게 */}
            {winType === "tsumo" && (
              <>
                {/* left(30,140) → you(140,30) */}
                <line x1="43" y1="127" x2="127" y2="43" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tsumo)" />
                {/* right(250,140) → you(140,30) */}
                <line x1="237" y1="127" x2="153" y2="43" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tsumo)" />
                {/* bottom(140,250) → you(140,30) */}
                <line x1="140" y1="232" x2="140" y2="48" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-tsumo)" />
              </>
            )}
          </svg>
        </div>

        {/* Summary text */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          {winType === "ron" ? (
            <p>
              당신이 <strong>론</strong>(다른 사람이 버린 패)으로 이겨 {getRonExplanation()}
            </p>
          ) : (
            <p>
              당신이 <strong>쯔모</strong>(자신이 뽑은 패)로 이겨 {getTsumoExplanation()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
