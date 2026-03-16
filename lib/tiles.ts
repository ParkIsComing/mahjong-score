// Tile display helpers

export const TILE_EMOJI: Record<string, string> = {
  // Man (characters)
  "1m": "🀇", "2m": "🀈", "3m": "🀉", "4m": "🀊", "5m": "🀋",
  "6m": "🀌", "7m": "🀍", "8m": "🀎", "9m": "🀏",
  // Pin (circles)
  "1p": "🀙", "2p": "🀚", "3p": "🀛", "4p": "🀜", "5p": "🀝",
  "6p": "🀞", "7p": "🀟", "8p": "🀠", "9p": "🀡",
  // Sou (bamboo)
  "1s": "🀐", "2s": "🀑", "3s": "🀒", "4s": "🀓", "5s": "🀔",
  "6s": "🀕", "7s": "🀖", "8s": "🀗", "9s": "🀘",
  // Winds
  east: "🀀", south: "🀁", west: "🀂", north: "🀃",
  // Dragons
  white: "🀆", green: "🀅", red: "🀄",
};

export const ALL_TILES: string[] = [
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}m`),
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}p`),
  ...Array.from({ length: 9 }, (_, i) => `${i + 1}s`),
  "east", "south", "west", "north",
  "white", "green", "red",
];

export function tileEmoji(tile: string): string {
  return TILE_EMOJI[tile] ?? tile;
}

export const YAKU_NAMES: Record<string, string> = {
  riichi: "리치",
  double_riichi: "더블 리치",
  ippatsu: "일발",
  tsumo: "멘젠쯔모",
  tanyao: "탕야오",
  pinfu: "핀후",
  iipeiko: "이페코",
  ryanpeikou: "량페코",
  yakuhai: "역패",
  shousangen: "소삼원",
  chiitoi: "치또이쯔",
  toitoi: "토이토이",
  sanankou: "산안코",
  chanta: "찬타",
  junchan: "준찬타",
  sanshoku_doujun: "산쇼쿠 도우준",
  sanshoku_doukou: "산쇼쿠 도우코",
  ittsu: "잇쑤",
  honitsu: "혼이쯔",
  chinitsu: "칭이쯔",
  dora: "도라",
  ura_dora: "우라도라",
  // 야쿠만
  kokushi: "국사무쌍",
  suuankou: "수안고",
  daisangen: "대삼원",
  shousuushii: "소사희",
  daisuushii: "대사희",
  tsuuiisou: "자일색",
  chinroutou: "청노두",
  ryuuiisou: "녹일색",
  chuuren: "구련보등",
  suukantsu: "사깡자",
  // 일반 역
  sankantsu: "산깡자",
};

export function yakuDisplayName(name: string): string {
  return YAKU_NAMES[name] ?? name;
}
