"use client";

import { ScoreResponse } from "@/lib/api";
import { yakuDisplayName } from "@/lib/tiles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreResultProps {
  score: ScoreResponse;
}

export function ScoreResult({ score }: ScoreResultProps) {
  const { han, fu, yaku, result, is_yakuman } = score;

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

        {/* Points */}
        <div className="grid grid-cols-2 gap-3">
          {result.ron !== undefined && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">론</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {result.ron.toLocaleString()}
              </p>
            </div>
          )}
          {result.tsumo_dealer !== undefined && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">쯔모</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                친 {result.tsumo_dealer?.toLocaleString()}
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                자 {result.tsumo_non_dealer?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
