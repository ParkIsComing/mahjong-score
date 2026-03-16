# 마작 점수 계산기

일본 마작(리치 마작) 손패를 입력하면 역·판수·부수·점수를 계산해주는 웹 앱입니다.

## 기능

- 손패 입력 (만수·통수·삭수·자패, 최대 14장)
- 론 / 쯔모 선택
- 리치·더블 리치·일발 지원
- 자풍·장풍 설정
- 도라·우라도라 표시패 선택
- 역 자동 감지 및 점수 계산 (역만 포함)

## 지원 역

일반 역: 리치, 더블 리치, 일발, 쯔모, 탕야오, 핀후, 이페코, 량페코, 역패, 소삼원, 토이토이, 산안코, 찬타, 준찬타, 산쇼쿠 도우준, 산쇼쿠 도우코, 잇쑤, 혼이쯔, 칭이쯔, 치이토이

역만: 스안커, 대삼원, 대사희, 소사희, 자일색, 청노두, 녹일색, 국사무쌍, 구련보등

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui

## API

`POST /api/score` — 손패 정보를 받아 점수를 반환합니다.

**요청 예시:**
```json
{
  "closed_hand": ["1m","2m","3m","4p","5p","6p","7s","8s","9s","east","east","east","white","white"],
  "win_type": "ron",
  "riichi": true,
  "seat_wind": "east",
  "round_wind": "east",
  "dora_indicators": ["2m"]
}
```

**응답 예시:**
```json
{
  "han": 3,
  "fu": 40,
  "yaku": [{"name": "riichi", "han": 1}, {"name": "dora", "han": 2}],
  "result": {"ron": 5200},
  "is_yakuman": false
}
```
