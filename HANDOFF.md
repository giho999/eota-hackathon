# EOTA(이어타) 인수인계 문서

> **용도**: 새 세션(에이전트/개발자)에서 이 프로젝트를 이어받을 때 이 문서를 먼저 읽고 진행한다.
> 프로젝트 루트: `/Users/leegiho/Lee/대외활동/내일로해커톤 2026/code`
> 최종 커밋: `8964351` (Phase 0~8 배포 준비까지 전체 구현)

---

## 0. 한 줄 소개

항공·철도 환승 시나리오에서 "이 열차를 탈 성공 확률 %"를 몬테카를로로 계산해 근거와 함께 제시하고,
여유 시간이 있으면 대전역 인근 관광 코스를 추천하는 챗봇. **내일로 해커톤 2026 출품작**.
설계 스펙 전체는 `AGENTS.md` (구현 사양이자 작업 지시서).

---

## 1. 즉시 실행 방법 (중요 — 순서대로)

```bash
# 1) Node 확인 — 반드시 /opt/homebrew/bin 을 PATH에 추가 (수동 설치됨)
export PATH="/opt/homebrew/bin:$PATH"
node --version   # v26.5.1 (Homebrew로 설치, 셸 기본 PATH에 없음 주의)

# 2) 의존성 (이미 설치됨, 재설치 시)
npm install      # next@15.3, react@19.1, tailwind@4, vitest@3.2, recharts@3.10

# 3) 개발 서버
npm run dev      # http://localhost:3000

# 4) 테스트 / 빌드 (Phase 게이트)
npm test         # vitest, 8 tests (simulate 4 + distributions 4)
npm run build
```

**dev 서버 기동 팁**: `(npm run dev > /tmp/eota-dev.log 2>&1 &)` 백그라운드로 띄우면
셸 세션이 끝나도 유지된다. 서버가 hang처럼 보이면 `pkill -9 -f next` 후 재기동.

---

## 2. 환경변수 / API 키 (배포 시 필수)

| 파일 | 용도 | 상태 |
|---|---|---|
| `.env.local` | `DATA_GO_KR_KEY` (실제 키, `%` 인코딩된 형태) | 존재 (git 제외됨) |
| `.env.local.bak` | 동일 키 백업 | 존재 (git 제외됨) |
| `.gitignore` | `.env*.local`, `.env.local.bak`, `.omo/`, `.playwright-mcp/`, `*.png` 제외 확인됨 | ✓ |

- **`.env.local`이 없으면 전체가 mock으로 동작**한다 (AGENTS.md §2-4 원칙).
- 키는 URL 인코딩(`%2F...`) 형태이며, 코드가 `key.includes('%')`로 자동 감지한다 (`serviceKeyParam`).
- **Vercel 배포 시**: 대시보드 → Settings → Environment Variables에 `DATA_GO_KR_KEY`를
  Production/Preview 둘 다 등록해야 라이브 API가 동작한다 (아직 미등록).

---

## 3. 라이브 API 연동 현황 (실제로 검증된 것)

| 용도 | 엔드포인트 | 상태 |
|---|---|---|
| 인천공항 **도착편** 목록 | `https://apis.data.go.kr/B551177/StatusOfPassengerFlightsDeOdp/getPassengerArrivalsDeOdp` | ✓ 검증됨 |
| 인천공항 **출국편** 목록 (유형 B용) | `.../getPassengerDeparturesDeOdp` | ✓ 검증됨 |
| 관광 (한국관광공사) | `https://apis.data.go.kr/B551011/KorService1/locationBasedList1` | 구현됨 (실데이터 미검증, mock 폴백) |

**중요 — 과거 실수**: `B552584/ms_ar_airport_operation_information`은 **존재하지 않는 엔드포인트**.
진단 결과 10초 타임아웃 → `B551177/...`로 교체함. 새 API를 붙일 때는 항상 `curl -m 10`으로 먼저 probe할 것.

- 응답 날짜 형식: `yyyyMMddHHmm` (**12자리**). `delayMin` 계산 정규식이 `^\d{12}$`.
  (과거에 14자리로 착각해 버그 발생 — 수정 완료)
- 도착편 응답 필드: `scheduleDateTime`(예정), `estimatedDateTime`(실제), `airportCode`, `terminalid`, `fid`, `remark`(==='도착'만 사용)
- 출국편 탑승마감: 실시간 오퍼레이션 없음 → **국제 40분/국내 20분 전 고정 규칙** (`boardingDeadlineMin`)
- `remark !== '도착'` 레코드는 제외 (이 서비스는 도착/출발 전용 파라미터 불필요)

---

## 4. 캐시 계층 (Vercel 배포 대비 안전화 완료)

- 캐시 디렉터리: **`os.tmpdir()/eota-cache`** (하드코딩 `.cache/` 아님 — Vercel 서버리스 대비).
  로컬 macOS에서는 `/var/folders/.../T/eota-cache` (주의: `/tmp` 아님, `os.tmpdir()` 확인 필요).
- 캐시 파일: `flights-{date}.json` (도착), `flights-dep-{date}.json` (출국), `tour-{station}-{radius}.json`, `immigration-{terminal}.json`
- **모든 I/O는 try/catch로 감쌈** — 캐시 읽기/쓰기 실패해도 그냥 라이브 API 직접 호출로 폴백 (크래시 없음, 성능만 저하)
- `scripts/collect-delays.ts` (루트에 `collect-delays.mjs`도 존재): `--stats`로 `.cache/delays.jsonl`(4113건) 감마 적합 결과 출력. `npx tsx scripts/collect-delays.ts --stats`
- 캐시 삭제 후 `npm run build && npm start`로 캐시 없는 상태 검증 **완료** (mock/라이브 모두 200)

---

## 5. 파일 구조 요약

```
src/
  app/page.tsx                    # 유형 A/B/C 전체 라우팅, 관광, Phase 7 폴링/알림
  app/api/flight/route.ts         # 항공 조회 (direction=arr|dep, live→mock 폴백)
  app/api/train/route.ts          # 열차 검색
  app/api/tour/route.ts           # 관광지 조회
  lib/engine/                     # 확률 엔진 (distributions/simulate/params)
  lib/adapters/                   # types + mock/ + live/ + index (키 기반 선택)
  lib/chat/                       # slots/flow/nlu/result (카드 순서, 세그먼트, 몬테카를로 조립)
  lib/tour/budget.ts              # §9 시간 예산 (2×도보+체류 ≤ 잔여−안전여유)
  components/chat/                # 카드 UI 12종
  components/result/              # ResultCard/TypeB/TypeC/Timeline/Histogram/ProbabilityBar/AlternativeCards
  components/tour/                # InterestCard/TourListCard
scripts/collect-delays.ts         # 소급 수집 + 노선별 gamma 적합 (--stats)
```

---

## 6. 유형별 동작 요약 (모두 브라우저 검증 완료)

### 유형 A — 비행기 → 기차
- 카드: 여정 → 항공편(KE1234 mock / TW248 실도착) → 목적지(대전) → 위탁수하물 → 여권 → 여유(30/20/10/타이트)
- 추천 규칙: **90% 이상 중 가장 이른 열차** = 안전 추천, 확률 무관 가장 이른 = "가장 빠른 선택" 카드 (30% 미만이면 "성공 가능성 낮음" + 회색 톤)
- 결과: 안전/타이트 2카드, 열차 목록(클릭 시 근거 패널 전환), 배기지 토글(재계산), "왜 이 확률인가요?" 펼침
- 50% 미만이면 대안 카드 ①②③ (다음 열차/이동수단 택시/경유역 광명역)

### 유형 B — 기차 → 비행기 (차별점)
- 카드: 항공편(출국, KE647 실출국) → 출발역(대전역) → 도심공항터미널 → 수하물 → 여권 → 여유
- **역산 계산**: baseTime=열차 출발, deadline=탑승마감. **90%+ 중 가장 늦은 열차** 추천 (유형 A와 반대)
- **도심공항터미널 비교 화면**: 같은 열차를 공항체크인 vs 사전체크인 2-case로 계산해 %p 차이 표시 (검증: 56% vs 98%)
  - 사전 체크인 시 `checkin` 세그먼트 제외 + `security` 전용통로(shape/scale 축소)

### 유형 C — 기차만
- 카드: 기차만 → 출발역·도착역(한 카드) → 출발 희망 시각 → 결과 (**카드 0 포함 3클릭**)
- 세그먼트: `toStation` + `inStation` **2개만** (수하물/여권/심사 DOM에 생성 안 됨 — 검증 완료)
- 추천: 유형 A와 동일 (90%+ 중 가장 이른)

### 관광 (§9, 유형 무관)
- **추천 열차 여유 ≥30분일 때만** InterestCard 노출. 문구: "추천 열차(KTX-1103) 기준, 65분의 여유가 있어요!"
- 관심사: 카페/역사·문화/자연·공원 → 코스 목록 ("도보 7분 · 머무름 15분 · 복귀 7분 = 29분, 여유 31분" + 예산 막대)
- 재계산 시(열차 변경/지연) 여유·추천번호·코스 함께 갱신

### Phase 7 — 능동 알림
- "⚡ 지연 발생 시뮬레이션" 버튼 (데모용, +15~25분 랜덤 누적) + "데모용 — 실제로는 자동으로 감지됩니다" 문구
- **자동 폴링**: 결과 화면 표시 중 60초 주기로 `/api/flight` 재조회, 지연 변화 없으면 재계산 생략
- 알림 조건: **10%p 이상 하락 시에만** 배너 "지연이 발생해 성공 확률이 94% → 84%로 떨어졌어요." (검증 완료)
- 추천 배지가 임계값 아래로 떨어지면 다음 후보로 자동 이동 (검증: 99→95→94→소멸)

---

## 7. 검증용 시나리오 / 테스트 편명

| 유형 | 편명 | 동작 |
|---|---|---|
| A (도착 mock) | `KE1234` | 대한항공 BKK, 지연 12분, mock 전용 (live null → mock 폴백) |
| A (도착 실) | `TW248` | 티웨이 NRT, 실데이터 |
| B (출국 실) | `KE647` | 대한항공 SIN, 23:35 출발, 탑승마감 22:55 (검증 시 사용) |
| B (출국 mock) | `OZ301` | 아시아나 SFO, mock 폴백 |
| C | 대전역→서울역, 1시간 후 | 여유 ~28분 (관광 미노출 확인용), 2시간 후는 여유 큼 |

브라우저 검증은 Playwright MCP 사용 (`skill_mcp` mcp_name="playwright"). 스냅샷/클릭으로 확인.

---

## 8. 최근 버그 수정 내역 (재발 방지용 — 반드시 숙지)

1. **gamma 샘플러**: Marsaglia-Tsang(shape≥1) + boosting(shape<1: Gamma(shape+1)×U^(1/shape)). Erlang 합산 방식 금지.
   `distributions.test.ts`에 shape=0.3 회귀 테스트 있음.
2. **flight 라우트 mock 폴백**: live가 해당 편명을 못 찾으면(null) mock으로 폴백해야 함 (`info` null 체크 추가).
3. **delayMin 정규식**: 12자리(`^\d{12}$`). 14자리로 쓰면 전부 null → "편명을 찾을 수 없어요".
4. **estimateExitMinutes**: flightDelay(avgDelayMin)는 baseTime에 이미 반영된 확정값이므로 **제외**.
   immigration + baggage(선택) + airportToStation(arex 43분)만 합산 → 55분 (유형 B는 별도 estimateDepartureMinutes).
5. **관광 순서**: buffer 질문 단계에선 관광 미노출. `hasResult`(유형별 결과 존재) 체크 + goBack 시 관광 상태 리셋.
6. **recompute flightOverride**: `setFlightInfo(오버라이드)` 후 recompute 호출 시 React 상태가 비동기라
   **이전 flightInfo 클로저**가 사용됨 → recompute 함수들이 `flightOverride` 파라미터를 받아 오버라이드된 flight를 직접 전달.
7. **추천 소멸 시 알림**: recommendTrain이 null(90%+ 없음)이면 maybeNotify가 안 불렸음 → `bestTrain` 폴백으로 최고 확률 열차 기준 비교.
8. **Histogram 잘림**: X축 domain을 `[0, max(데이터, 임계선)]`으로 확장, height 170px + top margin 28px.
9. **유형 B 추천**: `recommendTrainB`는 **가장 늦은 열차** (유형 A `recommendTrain`과 반대). 헷갈리지 말 것.
10. **dev 서버 hang**: 파일 수정 후 첫 요청이 느린 것은 정상(컴파일). 진짜 hang이면 구버전 프로세스 — `pkill -9 -f next` 후 재기동.
    이전에 live API가 실제로 불통인 걸 hang으로 오인한 사례 있음. 라이브 엔드포인트는 반드시 curl로 probe.

---

## 9. 배포 (Phase 8 — 미완, 인증 대기 중)

**완료된 것**:
- 캐시 경로 안전화 (os.tmpdir 기반, I/O try/catch 폴백) ✓
- 캐시 삭제 후 build && start 검증 ✓ (mock/라이브 200)
- git init + 커밋 (`8964351`) — `.env*`/`.omo`/`.playwright-mcp`/PNG 제외 확인 ✓

**남은 것 (인증 필요)**:
1. `npx vercel login` (인터랙티브) 또는 `VERCEL_TOKEN` 환경변수 제공 후 `npx vercel --prod`
   - 현재 Vercel CLI 설치됨(58.4.4) / GitHub CLI 설치됨(gh) / **둘 다 로그인 안 됨**
2. Vercel 대시보드에 `DATA_GO_KR_KEY` Production/Preview 환경변수 등록
3. 배포 후 회귀 테스트: 유형 A/B/C 클릭 관통 + 라이브 항공편 + **375px 모바일 뷰 레이아웃 확인**
4. 배포 URL QR 코드 생성 → README에 삽입 (데모 부스용)

---

## 10. 알려진 제약 / 폴리시

- **금지 사항** (AGENTS.md §2): DB/ORM/Docker/인증 금지, 상태관리 라이브러리 금지, 결제·예매 금지,
  API 키 없어도 mock으로 동작해야 함, shadcn/ui 대량 설치 금지, ML 라이브러리 금지.
- **확률 엔진**: 분포 적합 + 몬테카를로만. 설명 가능성이 최우선.
- 시연 범위는 **대전역 반경** (관광). 다른 역은 `STATION_COORDS`에 좌표 추가로 확장 가능.
- **fable 게이트**: `~/.claude/.fable-state`가 `off` 상태 (사용자가 직접 구현 모드로 전환).
  게이트가 다시 켜지면(`on`) 코드 직접 수정이 턴당 2파일로 제한됨 — 위임 전환 필요.
  서브에이전트(백그라운드)는 이전에 hang 이력이 있어, 복잡하면 동기 실행 권장.
- `prior-only` 모수는 UI에 "추정값" 배지 필요 (AGENTS.md §12 완료 기준, 아직 배지 UI 없음 — 남은 작업).

---

## 11. 남은 작업 후보 (우선순위순)

1. **Vercel 배포 완료** (인증 → env 등록 → 회귀 테스트 → QR)
2. `prior-only` 모수 추정값 배지 (완료 기준 미충족)
3. 유형 B 관광 시: 출발역 기준 코스 (현재는 station 로직 공유, 검증 필요)
4. `LiveTourAdapter` 실데이터 검증 (키 있으면 실제 관광지 반환 확인)
5. README 작성 (QR 포함, AGENTS.md §11 Phase 8)
