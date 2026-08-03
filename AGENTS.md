# 이어타 (EOTA) — 항공·철도 환승 성공 확률 예측 챗봇

내일路 해커톤 2026 출품작. 이 문서는 구현 사양이자 작업 지시서다.
읽고 나서 바로 Phase 0부터 순서대로 진행한다.

---

## 0. 한 줄 정의

사용자가 챗봇 카드에 3~5개만 답하면, 항공·철도 실시간 데이터를 몬테카를로로 합성해
**"이 열차를 탈 성공 확률 %"** 를 근거와 함께 제시하고, 남는 대기 시간을 지역 관광 코스로 연결한다.

---

## 1. 기술 스택 (변경 금지)

- Next.js 15 App Router + TypeScript (strict)
- Tailwind CSS
- Vitest (단위 테스트)
- Recharts (분포 히스토그램)
- 데이터 저장: **파일 기반 JSON 캐시** (`.cache/` 디렉터리). DB 없음.
- LLM: 어댑터 패턴. `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` 없으면 규칙 기반으로 자동 폴백.

`npm run dev` 하나로 실행되어야 한다. Docker, 별도 백엔드 서버, ORM, 인증 없음.

---

## 2. 절대 하지 말 것

1. **DB/ORM/Prisma/Docker/인증 도입 금지.** 해커톤 3일, 3인 팀이다.
2. **Redux/Zustand 등 상태관리 라이브러리 금지.** React state + Context로 충분하다.
3. **실제 결제·예매 구현 금지.** 예매는 정보 요약 카드 + 외부 링크까지만.
4. **API 키가 없다고 앱이 죽으면 안 된다.** 키 없으면 무조건 mock 어댑터로 동작.
5. **shadcn/ui, MUI 등 컴포넌트 라이브러리 대량 설치 금지.** Tailwind로 직접 작성.
6. **Phase를 건너뛰지 말 것.** 각 Phase 끝에서 `npm test`와 `npm run build`가 통과해야 다음으로 간다.
7. 확률 엔진에 **머신러닝 라이브러리 쓰지 말 것.** 분포 적합 + 몬테카를로만 쓴다. 이유는 §4 참조.

---

## 3. 디렉터리 구조

```
src/
  app/
    page.tsx                 채팅 화면 (단일 스크롤)
    api/
      flight/route.ts        항공편 조회 프록시
      train/route.ts         열차 조회 프록시
      congestion/route.ts    입국장 혼잡도 프록시
      tour/route.ts          관광 후보 프록시
  lib/
    engine/
      distributions.ts       난수 생성기
      simulate.ts            몬테카를로 코어
      params.ts              구간별 모수 테이블 (출처 주석 필수)
      journeys.ts            유형 A/B/C별 세그먼트 조립
      index.ts
    adapters/
      types.ts               어댑터 인터페이스
      mock/                  목 데이터 (항상 동작)
      live/                  실 API 구현
      index.ts               env 보고 mock/live 선택
    chat/
      flow.ts                유형별 카드 순서 정의
      slots.ts               슬롯 정의 및 검증
      nlu.ts                 LLM 또는 규칙 기반 슬롯 추출
    tour/
      budget.ts              시간 예산 기반 코스 필터
  components/
    chat/                    카드 UI 컴포넌트
    result/                  확률 결과·근거·분포
  types/
```

---

## 4. 확률 엔진 (가장 중요 — 여기부터 만든다)

### 4.1 왜 ML이 아닌가

사용자에게 "왜 89%인가"를 답해야 하는 서비스다. 구간별로 어떤 분포에서 몇 분이 나왔는지
그대로 화면에 펼쳐야 하므로 **설명 가능성이 정확도보다 우선**한다.
종단간 학습 모델은 같은 수치를 근거와 함께 제시할 수 없고, 3일 안에 학습 데이터도 못 모은다.

### 4.2 타입 (이대로 구현할 것)

```ts
export type Distribution =
  | { kind: 'gamma';    shape: number; scale: number }
  | { kind: 'normal';   mean: number;  sd: number }
  | { kind: 'uniform';  min: number;   max: number }
  | { kind: 'constant'; value: number };

export interface Segment {
  id: string;
  label: string;        // 화면에 그대로 노출됨. 한국어.
  dist: Distribution;
  source: string;       // 모수 출처. 예: 'ICN 운항현황 API 소급 30일'
}

export interface SimulationInput {
  segments: Segment[];
  baseTimeMin: number;      // 기준 시각 (분 단위 epoch)
  deadlineMin: number;      // 마감 시각
  iterations?: number;      // 기본 10000
  seed?: number;            // 재현성. 지정 시 결정론적 PRNG 사용
}

export interface SimulationResult {
  probability: number;                  // 0..1
  percentiles: { p50: number; p80: number; p95: number };
  histogram: { binStart: number; binEnd: number; count: number }[];
  timeline: {                           // 근거 펼침 화면용
    id: string;
    label: string;
    meanMinutes: number;
    cumulativeMin: number;              // 누적 시각
  }[];
}

export function simulate(input: SimulationInput): SimulationResult;
```

### 4.3 유형별 세그먼트

**유형 A — 비행기 → 기차 (인천공항 입국 후 지방 이동)**

| id | 구간 | 분포 | 비고 |
|---|---|---|---|
| `flightDelay` | 항공 도착 지연 | gamma | 노선별 소급 통계에서 적합 |
| `immigration` | 입국 심사 | gamma | 내국인/외국인 분리 |
| `baggage` | 수하물 수취 | normal | 기내 수하물만이면 **세그먼트 자체를 제외** |
| `airportToStation` | 공항 → 역 이동 | normal | 공항철도/리무진/택시별 |

**유형 B — 기차 → 비행기 (지방 → 인천공항 출국)**

인천공항행 KTX 직결 노선은 2018년 9월 폐지되었다. **KTX + 공항철도 2단 환승**으로 계산한다.
지방역 → (KTX) → 서울역/광명역 → (공항철도) → 인천공항 T1/T2

| id | 구간 | 분포 | 비고 |
|---|---|---|---|
| `trainDelay` | 열차 지연 | gamma | |
| `stationTransfer` | 하차 후 역내 도보 | normal | |
| `arexWait` | 공항철도 배차 대기 | **uniform(0, headway)** | 아래 주의 |
| `arexRide` | 공항철도 소요 | normal | |
| `terminalWalk` | 터미널 내 이동 | constant | |
| `checkin` | 체크인·수하물 위탁 | normal | 도심공항터미널 이용 시 제외 |
| `security` | 보안검색 | gamma | 도심공항터미널 이용 시 shape/scale 축소 |
| `emigration` | 출국심사 | gamma | |

> **배차 대기가 유형 B의 핵심이다.** 열차 도착 시각이 배차 주기 안에서 균등분포한다고 보아
> `uniform(0, headway)`로 둔다. 이 항은 평균이 아니라 **최악의 경우가 성패를 가르므로**
> 평균값 합산으로는 절대 포착되지 않는다. 유형 B에 몬테카를로가 필요한 직접적 이유다.

계산 방향은 **역산**이다. 항공편 탑승 마감 시각을 `deadlineMin`으로 두고,
각 후보 열차의 출발 시각을 `baseTimeMin`으로 넣어 확률을 구한 뒤,
**성공 확률이 임계값 이상인 가장 늦은 열차**를 추천한다.

**도심공항터미널 분기 (차별점 — 반드시 구현)**

서울역·광명역 도심공항터미널에서 사전 체크인하면 `checkin`이 공항이 아닌 역에서 소진되고
`security`도 전용 통로가 적용된다. 같은 열차에 대해 **두 경우를 모두 계산해 비교 제시**한다.

```
인천공항에서 체크인      → KTX 14:20편 성공 확률 74%
광명역 사전 체크인        → 동일 열차 성공 확률 93%
```

"탈 수 있다/없다"가 아니라 **"어떻게 하면 탈 수 있는가"** 를 보여주는 화면이다.

**유형 C — 기차만**

| id | 구간 | 분포 |
|---|---|---|
| `toStation` | 출발지 → 역 이동 | normal |
| `inStation` | 역 내 이동 | normal |

수하물·여권·입국심사 세그먼트는 **생성 자체를 하지 않는다.**

### 4.4 모수 테이블

`params.ts`에 모든 모수를 모으고, 각 항목에 **출처와 확보 상태를 주석으로 남긴다.**

```ts
export const PARAMS = {
  flightDelay: {
    default: { kind: 'gamma', shape: 2, scale: 6 },
    source: 'ICN 운항현황 API D-3~D+6 소급 수집 후 적합',
    status: 'confirmed',
  },
  immigration: {
    domestic: { kind: 'gamma', shape: 3, scale: 1.6 },
    foreign:  { kind: 'gamma', shape: 3, scale: 4.0 },
    source: '입국장현황 API 대기인원 → 대기행렬 환산 (§6 참조)',
    status: 'needs-calibration',
  },
  baggage: {
    default: { kind: 'normal', mean: 18, sd: 6 },
    source: '공개 API 없음. 팀 실측 및 공항 안내 기준값을 사전 분포로 사용',
    status: 'prior-only',
  },
  // ...
} as const;
```

`status`가 `prior-only`인 항목은 UI에서 **"추정값" 배지**를 달아 사용자에게도 알린다.
데이터 공백을 숨기지 않는 것이 이 프로젝트의 방침이다.

---

## 5. 데이터 어댑터

### 5.1 인터페이스

```ts
export interface FlightAdapter {
  lookup(flightNo: string, date: string): Promise<FlightInfo | null>;
  delayStats(route: string): Promise<Distribution>;
}
export interface TrainAdapter {
  search(fromStation: string, toStation: string, afterTime: number): Promise<TrainOption[]>;
}
export interface CongestionAdapter {
  immigrationQueue(terminal: 'T1' | 'T2'): Promise<{ domestic: number; foreign: number }>;
}
export interface TourAdapter {
  nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]>;
}
```

### 5.2 mock/live 선택

```ts
// lib/adapters/index.ts
const useLive = Boolean(process.env.DATA_GO_KR_KEY);
export const flight = useLive ? new LiveFlightAdapter() : new MockFlightAdapter();
```

**mock이 기본이다.** 키가 없어도 전체 흐름이 끝까지 돌아야 한다.
mock 데이터는 실제 API 응답 스키마를 그대로 따르되 값만 고정한다.

### 5.3 실 API 제약 (live 어댑터 구현 시 반드시 지킬 것)

| API | 제약 | 용도 |
|---|---|---|
| 항공기 운항 현황 | D-3 ~ D+6 조회 가능 | **소급 수집으로 지연 분포 적합.** 여기서 표본을 만든다 |
| 승객예고 (출·입국장별) | 일 1,000건, 조회일+1까지 | **시간대별 기준 혼잡 패턴 구축** |
| 입국장 현황 | H-2 ~ H+2, 일 500건 | **당일 보정용으로만.** 분포 추정에 쓰면 표본이 안 나온다 |

> 분포의 **형상**은 소급 수집과 예측값으로 만들고, 실시간 API는 그 분포를 당일 상황에 맞게
> **이동시키는 역할만** 한다. 짧은 개발 기간에 실시간 API만으로 이력을 쌓는 접근은
> 표본 수 측면에서 성립하지 않는다.

응답은 `.cache/`에 타임스탬프와 함께 저장하고, 재요청 시 TTL 안이면 캐시를 쓴다.

---

## 6. 입국 심사 대기인원 → 대기시간 환산

입국장현황 API는 **대기 인원(명)과 혼잡도 등급만** 주고 분 단위 시간은 주지 않는다.
따라서 대기행렬로 환산한다.

```
E[대기시간] ≈ 대기인원 N / (가동 심사대 수 c × 심사대당 분당 처리율 μ)
```

`c`와 `μ`는 공개 데이터에 없다. `params.ts`에 사전값으로 두고 `status: 'needs-calibration'`을 붙인다.
내국인/외국인은 μ가 다르므로 분리한다.

이 환산 계수가 프로젝트에서 검증이 가장 필요한 부분이다. 코드에 TODO로 명시해둘 것.

---

## 7. 대화 흐름

### 7.1 질문 설계 원칙 (절대 어기지 말 것)

**API가 아는 것은 묻지 않는다.** 항공기 지연, 공항 혼잡도, 도착 터미널, 열차 시각표, 잔여석은
전부 조회 가능하므로 질문 카드를 만들지 않는다.
**사용자만 아는 것만 묻는다.** 위탁 수하물 유무, 여권 종류, 목적지, 여유 시간.

결과: 유형 C는 질문 3개, 유형 A·B는 질문 5개로 끝난다.

### 7.2 카드 순서

```
카드 0  여정 유형          [비행기 → 기차] [기차 → 비행기] [기차만]

유형 A:  항공편명 → 최종 목적지 → 위탁 수하물 → 여권 종류 → 여유 시간
유형 B:  항공편명 → 출발역 → 도심공항터미널 이용 → 위탁 수하물 → 여권 → 도착 여유
유형 C:  출발역·도착역 → 출발 희망 시각
```

**여유 시간은 반드시 마지막에 묻는다.** 사용자는 자기가 몇 분이 필요한지 모르는 상태에서
답하게 되므로, 앞선 답으로 계산한 근거를 먼저 제시한 뒤 질문한다.

```
"지금까지 정보로는 공항을 빠져나오는 데 평균 38분 정도 걸릴 것 같아요.
 여유를 얼마나 두고 열차를 잡을까요?"   [30분] [20분] [10분]
```

### 7.3 자동 생략 규칙

- 유형 C: 수하물·여권 카드 **생성 안 함**
- 국내선 도착으로 판별: 유형 A에서 여권 카드 생략
- 항공편명 입력 즉시 항공사·출발지·터미널·도착시각·평균 지연을 조회해 확인 카드로 표시

### 7.4 LLM 개입 지점 (키 있을 때만)

1. 자유 발화 슬롯 추출 — "다음 주 목요일 인천 도착해서 대전 가는데요" → 유형/목적지 채움
2. 목적지 → 하차역 후보 전개 — "대전 유성구" → 대전역/서대전역/오송역 (각각 확률 계산)
3. 근거 문장 생성 — "수하물을 부치지 않으셨다면 이 열차도 96%로 가능했습니다"
4. 관광 코스 추천 사유 생성

**키가 없으면 1은 폼 입력으로, 2는 정적 매핑 테이블로, 3·4는 템플릿 문자열로 대체한다.**
확률 계산 자체에는 LLM이 절대 개입하지 않는다.

---

## 8. 결과 화면

### 8.1 확률 결과

후보 열차를 확률 막대와 함께 나열. 등급별 색상: 80% 이상 파랑/초록, 50~80% 주황, 50% 미만 빨강.

**추천 선정 규칙**
- 유형 A(비행기→기차): **확률 90% 이상을 만족하는 가장 이른 출발 열차**를 "안전 추천"으로 노출.
- **"가장 빠른 선택" 카드**: 확률 기준과 무관하게 전체 후보 중 가장 이른 열차를 확률 그대로 함께 노출.
  예: "안전 추천 (90% 이상) · KTX-1102 · 98%" / "가장 빠른 선택 · KTX-1101 · 67%"
- 두 조건을 같은 열차가 만족하면 카드를 하나로 합친다("안전 추천 · 가장 빠른 선택").
- 유형 B(기차→비행기)는 "가장 늦은 열차" 규칙을 적용 (Phase 4).

**확률이 50% 미만이면 열차 목록 대신 대안 카드를 먼저 띄운다.**
① 다음 열차 이용 ② 이동 수단 변경 ③ 경유역 변경 — 각각의 확률과 함께.

### 8.2 근거 펼침

`SimulationResult.timeline`을 그대로 세로 타임라인으로 렌더링.
각 줄에 단계별 소요(`+n분`)와 **누적 소요**(`누적 n분`, 출발점부터 총 경과)를 함께 표기.

```
14:35  항공 도착 예정
14:47  실시간 지연 반영     +12분 · 누적 12분
14:55  입국 심사            +12분 · 누적 24분
15:13  수하물 수취          +18분 · 누적 42분
15:56  공항철도 서울역      +43분 · 누적 85분
16:10  KTX 출발             여유 14분
```

패널은 항상 **선택한 열차의 실제 `SimulationResult`**를 렌더링하며, 열차를 바꿔 클릭하면
시각·누적·여유가 함께 갱신된다. 아래에 `histogram`을 그리고 `deadlineMin` 위치에 임계선을 긋는다.
임계선 왼쪽 영역이 성공 확률임을 라벨로 표시.

---

## 9. 관광 (유형 무관, 대기 30분 이상일 때만)

확률 엔진의 **재사용**이다. 별도 기능이 아니다.

```
2 × 도보시간 + 체류시간 ≤ 잔여시간 − 안전여유
```

- 관심사는 **여기서 처음 묻는다.** 열차가 정해지기 전에 취향을 물으면 답할 이유가 없다.
- 코스는 "도보 7분 · 머무름 15분 · 복귀 7분 = 29분, 여유 11분"으로 분해해 제시
- **예산 대비 소진 막대**로 표시 ("40분 중 29분 사용")
- 열차 지연 발생 시 관광 목록도 **함께 재계산**한다

시연 범위는 대전역 반경으로 한정. 좌표와 소요 시간만 있으면 동일 로직이 다른 역에도 적용된다.

---

## 10. 디자인 토큰

이미 확정된 목업이 있다. 이 값을 그대로 쓴다.

```
navy    #10315C   헤더, 강조 텍스트
blue    #1E63B8   주 버튼, 확률 막대
blueL   #E9F0FA   보조 배경
border  #DCE2EA
bg      #F3F5F8
text    #1A1D23
sub     #6B7482
green   #127A4B   여유
amber   #B0730A   경고
red     #B3271E   위험
```

- 카드 radius 12~14px, 그림자 없음, 단일 스크롤
- 헤더에 `질문 2 / 5` 진행 표시 (끝이 보인다는 신호)
- 폰트: 시스템 sans (맑은 고딕 계열)

---

## 11. 작업 순서

각 Phase 끝에서 `npm test`와 `npm run build`가 통과해야 다음으로 넘어간다. Phase마다 커밋한다.

### Phase 0 — 엔진 우선
- Next.js + TS + Tailwind + Vitest 스캐폴딩
- `lib/engine/` 전체 구현 (UI 없음)
- 테스트: 시드 고정 시 결과 재현, 상수 분포만 넣으면 확률 0 또는 1,
  마감을 무한대로 두면 확률 1, 수하물 세그먼트 제거 시 확률 상승
- **검증**: `npm test` 통과

### Phase 1 — 유형 A 관통 (mock)
- 카드 UI, 슬롯 채우기, mock 어댑터로 결과 화면까지 연결
- **검증**: 브라우저에서 카드 0부터 확률 결과까지 클릭만으로 도달

### Phase 2 — 근거 화면
- 타임라인 + 히스토그램 + 임계선
- 50% 미만 시 대안 카드
- **검증**: 수하물 토글에 따라 확률과 타임라인이 함께 변함

### Phase 3 — 실 API 어댑터
- live 어댑터 구현, 캐시 계층, 소급 수집 스크립트 (`scripts/collect-delays.ts`)
- **검증**: 키 없이도 mock으로 동작, 키 있으면 실데이터로 동작
- **Train 보류 (Phase 3)**: `한국철도공사_열차운행정보`는 실시간 지연이 아닌 운행계획/운행정보(보존 3개월~1일 전)라 당일 실시간 조회 불가 → `MockTrainAdapter` 유지. 이후 Phase에서 재검토.

### Phase 4 — 유형 B (차별점)
- 2단 환승 세그먼트, 역산 계산, 도심공항터미널 비교 화면
- **검증**: 같은 열차에 대해 터미널 이용 여부로 두 확률이 나옴

### Phase 5 — 유형 C
- 질문 3개로 완결되는지 확인
- **검증**: 수하물·여권 카드가 생성조차 되지 않음

### Phase 6 — 관광
- 시간 예산 필터, 코스 상세, 예산 막대

### Phase 7 — 능동 알림 (시연용)
- 지연 시뮬레이션 트리거 → 확률 재계산 → **10%p 이상 하락 시에만** 알림

### Phase 8 — 배포
- Vercel에 배포한다
- 환경변수는 Vercel 대시보드에서 설정하고, 없으면 mock으로 동작하는 성질을 유지한다
- 배포 URL로 접속되는 QR 코드를 README에 넣는다
- **검증**: 폰에서 QR 찍어 접속했을 때 전체 흐름이 동작한다

**Phase 0~2가 서비스의 존재 증명이고, Phase 4가 차별점의 증명이다.**
시간이 부족하면 Phase 5~7을 버리되, **Phase 0~2를 희생해 뒤를 넓히지 않는다.**

---

## 12. 완료 기준

- [ ] 키 없이 `npm install && npm run dev`로 전체 흐름이 동작한다
- [ ] 유형 A·B·C 모두 결과 화면까지 도달한다
- [ ] 유형 C는 질문 3개, A·B는 5개 이내다
- [ ] 확률 결과에 항상 근거 타임라인과 분포가 따라온다
- [ ] `status: 'prior-only'` 모수는 UI에 추정값 배지가 붙는다
- [ ] 유형 B에서 도심공항터미널 이용 여부로 확률이 갈린다
- [ ] `npm test` 통과, `npm run build` 성공
