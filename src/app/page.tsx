'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/chat/Header';
import JourneyTypeCard from '@/components/chat/JourneyTypeCard';
import FlightCard from '@/components/chat/FlightCard';
import DestinationCard from '@/components/chat/DestinationCard';
import DepartureStationCard from '@/components/chat/DepartureStationCard';
import CityTerminalCard from '@/components/chat/CityTerminalCard';
import RouteCard from '@/components/chat/RouteCard';
import WishTimeCard from '@/components/chat/WishTimeCard';
import BaggageCard from '@/components/chat/BaggageCard';
import PassportCard from '@/components/chat/PassportCard';
import BufferCard from '@/components/chat/BufferCard';
import ResultCard from '@/components/result/ResultCard';
import TypeBResultCard from '@/components/result/TypeBResultCard';
import TypeCResultCard from '@/components/result/TypeCResultCard';
import InterestCard from '@/components/tour/InterestCard';
import TourListCard from '@/components/tour/TourListCard';
import type { ScenarioResult, TypeBScenario, TypeCScenario, TrainResult } from '@/lib/chat/result';
import { SCENARIOS, bestTrain, computeTypeAResults, computeTypeBResults, computeTypeCResults, recommendTrain, recommendTrainB, recommendTrainC } from '@/lib/chat/result';
import { EMPTY_SLOTS, type ChatSlots, type JourneyType } from '@/lib/chat/slots';
import { cardsFor, estimateDepartureMinutes, estimateExitMinutes } from '@/lib/chat/flow';
import { fitCourses, type BudgetedCourse } from '@/lib/tour/budget';
import type { FlightInfo, TourCategory, TourSpot, TrainOption } from '@/lib/adapters';

export default function Home() {
  const [slots, setSlots] = useState<ChatSlots>(EMPTY_SLOTS);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [cards, setCards] = useState<string[]>([]);
  const [results, setResults] = useState<ScenarioResult[] | null>(null);
  const [typeBResults, setTypeBResults] = useState<TypeBScenario[] | null>(null);
  const [typeCResult, setTypeCResult] = useState<TypeCScenario | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState('primary');
  const [baggageChecked, setBaggageChecked] = useState(false);
  const [bufferTimeMin, setBufferTimeMin] = useState(0);
  const [loading, setLoading] = useState(false);
  // 관광 상태 (§9) — 항상 추천 열차 기준. 어느 열차인지 표시용 번호 함께 저장.
  const [tourSlackMin, setTourSlackMin] = useState(0);
  const [tourRecTrainNo, setTourRecTrainNo] = useState<string | null>(null);
  const [interest, setInterest] = useState<TourCategory | null>(null);
  const [tourCourses, setTourCourses] = useState<BudgetedCourse[]>([]);
  // Phase 7: 지연 시뮬레이션 알림
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [simDelay, setSimDelay] = useState(0); // 시뮬레이션으로 추가된 지연(분)

  const isTypeB = slots.journeyType === 'B';
  const isTypeC = slots.journeyType === 'C';
  const flowCards = slots.journeyType ? cardsFor(slots.journeyType, flightInfo?.isDomestic) : [];
  const questionIndex = flowCards.findIndex((c) => !cards.includes(c.id));
  const nextCard = questionIndex >= 0 ? flowCards[questionIndex] : null;
  // 결과 화면이 실제로 표시 중인지 (관광 섹션은 결과 이후에만)
  const hasResult = isTypeC
    ? Boolean(typeCResult)
    : isTypeB
      ? Boolean(typeBResults)
      : Boolean(results);

  function setSlot(slot: keyof ChatSlots, value: unknown, cardId: string) {
    setSlots((s) => ({ ...s, [slot]: value }));
    setCards((c) => [...c, cardId]);
  }

  // 추천 열차의 예상 여유 시간(분). §9 트리거(30분 이상)와 예산 계산에 사용.
  function slackOf(tr: TrainResult): number {
    const last = tr.result.timeline[tr.result.timeline.length - 1]?.cumulativeMin ?? tr.result.timeline[0]?.cumulativeMin ?? 0;
    return Math.round(tr.train.departureMin - last);
  }

  // 관심사 선택 → tour API 조회 → 시간 예산 필터
  async function pickInterest(category: TourCategory) {
    setInterest(category);
    const station = isTypeB
      ? (slots.departureStation ?? '대전역')
      : isTypeC
        ? (slots.route?.from ?? '대전역')
        : (slots.destinationStation ?? '대전역');
    const res = await fetch(`/api/tour?station=${encodeURIComponent(station)}&radius=15`);
    const spots = (await res.json()) as TourSpot[];
    const courses = fitCourses(spots.filter((s) => s.category === category), tourSlackMin);
    setTourCourses(courses);
  }

  // 결과 확정 시 여유 시간 계산 + 관광 리셋 (재계산 연동 §9-6)
  // 관광은 항상 추천 열차 기준 — 어느 열차인지 번호를 함께 저장해 문구에 표시
  function finalizeSlack(slackMin: number, recTrainNo?: string | null) {
    setTourSlackMin(slackMin);
    setTourRecTrainNo(recTrainNo ?? null);
    setInterest(null);
    setTourCourses([]);
  }

  // Phase 7: 이전 확률과 비교해 10%p 이상 하락 시에만 알림 (노이즈 방지)
  function maybeNotify(prevPct: number | null, newPct: number | null) {
    if (prevPct === null || newPct === null) return;
    const drop = prevPct - newPct;
    if (drop >= 10) {
      setAlertMsg(`지연이 발생해 성공 확률이 ${prevPct}% → ${newPct}%로 떨어졌어요.`);
    } else {
      setAlertMsg(null); // 소폭 변화: 알림 없이 숫자만 갱신
    }
  }

  // 마지막 답을 되돌려 이전 질문 카드로 복귀
  function goBack() {
    if (cards.length === 0) return;
    const last = cards[cards.length - 1];
    setCards((c) => c.slice(0, -1));
    switch (last) {
      case 'flight':
        setFlightInfo(null);
        setSlots((s) => ({ ...s, flightNo: null }));
        break;
      case 'destination':
        setSlots((s) => ({ ...s, destinationStation: null, destination: null }));
        break;
      case 'departureStation':
        setSlots((s) => ({ ...s, departureStation: null }));
        break;
      case 'cityTerminal':
        setSlots((s) => ({ ...s, cityTerminal: null }));
        break;
      case 'route':
        setSlots((s) => ({ ...s, route: null }));
        break;
      case 'wishTime':
        setTypeCResult(null);
        setSlots((s) => ({ ...s, wishTimeMin: null }));
        break;
      case 'baggage':
        setSlots((s) => ({ ...s, checkedBaggage: null }));
        break;
      case 'passport':
        setSlots((s) => ({ ...s, passport: null }));
        break;
      case 'buffer':
        setResults(null);
        setTypeBResults(null);
        setSlots((s) => ({ ...s, bufferTimeMin: null }));
        // 여유 시간 질문으로 복귀 시 관광 섹션도 함께 리셋 (질문 단계에선 안 보여야 함)
        setTourSlackMin(0);
        setTourRecTrainNo(null);
        setInterest(null);
        setTourCourses([]);
        break;
    }
  }

  async function recomputeTypeA(baggage: boolean, buffer: number, prevPct?: number | null, flightOverride?: FlightInfo) {
    const flight = flightOverride ?? flightInfo;
    if (!flight) return;
    setLoading(true);
    try {
      // 서버 전용 어댑터는 /api/train 프록시로 조회 (클라이언트 번들에서 분리)
      const optionsByScenario: TrainOption[][] = [];
      for (const config of SCENARIOS) {
        const res = await fetch(
          `/api/train?from=${encodeURIComponent(config.from)}&to=${encodeURIComponent(config.to)}&after=${flight.scheduledArrivalMin + config.searchOffsetMin}`,
        );
        optionsByScenario.push(await res.json());
      }
      const scenarioResults = computeTypeAResults(flight, baggage, buffer, optionsByScenario);
      setResults(scenarioResults);
      const rec = recommendTrain(scenarioResults[0]);
      // 추천 없음(90%+ 미만)이면 최고 확률 열차 기준으로 알림 비교
      const notifyTrain = rec ?? bestTrain(scenarioResults[0]);
      if (rec) finalizeSlack(slackOf(rec), rec.train.trainNo);
      if (prevPct !== undefined) maybeNotify(prevPct, Math.round(notifyTrain.result.probability * 100));
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function recomputeTypeB(prevPct?: number | null, flightOverride?: FlightInfo) {
    const flight = flightOverride ?? flightInfo;
    if (!flight || !slots.departureStation) return;
    setLoading(true);
    try {
      const station = slots.departureStation;
      const deadline = flight.boardingDeadlineMin ?? flight.scheduledArrivalMin - 40;
      const after = Math.floor(Date.now() / 60000);
      const res = await fetch(
        `/api/train?from=${encodeURIComponent(station)}&to=${encodeURIComponent('서울역')}&after=${after}`,
      );
      const options = (await res.json()) as TrainOption[];
      const scenarios = computeTypeBResults(flight, flight.isDomestic, deadline, options);
      setTypeBResults(scenarios);
      // 도심공항터미널 case 추천 여유 기준 (§9: 유형 무관)
      const rec = recommendTrainB(scenarios[1]);
      finalizeSlack(
        Math.round(deadline - (rec.result.timeline[rec.result.timeline.length - 1]?.cumulativeMin ?? rec.train.departureMin)),
        rec.train.trainNo,
      );
      if (prevPct !== undefined) maybeNotify(prevPct, Math.round(rec.result.probability * 100));
    } catch {
      setTypeBResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function recomputeTypeC(wishTimeMin: number, route: { from: string; to: string }) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/train?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&after=${wishTimeMin - 120}`,
      );
      const options = (await res.json()) as TrainOption[];
      const scenario = computeTypeCResults(Math.floor(Date.now() / 60000), options);
      setTypeCResult(scenario);
      const rec = recommendTrainC(scenario);
      if (rec) finalizeSlack(slackOf(rec), rec.train.trainNo);
    } catch {
      setTypeCResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function finish(buffer: number) {
    setSlots((s) => ({ ...s, bufferTimeMin: buffer }));
    setCards((c) => [...c, 'buffer']);
    if (isTypeB) {
      await recomputeTypeB();
    } else {
      const baggage = slots.checkedBaggage === true;
      setBaggageChecked(baggage);
      setBufferTimeMin(buffer);
      await recomputeTypeA(baggage, buffer);
    }
  }

  // Phase 7: 현재 추천 확률(%) 추출 (알림 비교용)
  function currentRecPct(): number | null {
    if (isTypeC) {
      if (!typeCResult) return null;
      const rec = recommendTrainC(typeCResult);
      return rec ? Math.round(rec.result.probability * 100) : null;
    }
    if (isTypeB) {
      if (!typeBResults) return null;
      return Math.round(recommendTrainB(typeBResults[1]).result.probability * 100);
    }
    if (!results || results.length === 0) return null;
    const rec = recommendTrain(results[0]);
    return rec ? Math.round(rec.result.probability * 100) : null;
  }

  // Phase 7: 지연 발생 시뮬레이션 — 라이브 어댑터를 건드리지 않고 flightInfo 오버라이드 레이어로 재계산
  async function simulateDelay() {
    if (!flightInfo) return;
    const prevPct = currentRecPct();
    const addMin = 15 + Math.floor(Math.random() * 11); // +15~25분
    setSimDelay((d) => d + addMin);
    const overridden: FlightInfo = { ...flightInfo, avgDelayMin: flightInfo.avgDelayMin + addMin };
    setFlightInfo(overridden);
    if (isTypeB) {
      await recomputeTypeB(prevPct, overridden);
    } else if (isTypeC) {
      // 유형 C는 항공 무관 — 열차 지연 시뮬레이션 없음(버튼 숨김)
      return;
    } else {
      const baggage = slots.checkedBaggage === true;
      await recomputeTypeA(baggage, bufferTimeMin, prevPct, overridden);
    }
  }

  // Phase 7 보강: 자동 폴링 — 결과 화면 표시 중 실시간 상태를 주기적으로 재조회
  const lastDelayRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hasResult || !flightInfo) return;
    const flightNo = flightInfo.flightNo;
    const direction = isTypeB ? 'dep' : 'arr';
    lastDelayRef.current = flightInfo.avgDelayMin;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/flight?no=${encodeURIComponent(flightNo)}&direction=${direction}`);
        const data = (await res.json()) as FlightInfo;
        if (!data.flightNo || typeof data.avgDelayMin !== 'number') return;
        // API 호출 절약: 지연 값 변화가 없으면 재계산 생략
        if (data.avgDelayMin === lastDelayRef.current) return;
        lastDelayRef.current = data.avgDelayMin;
        setFlightInfo(data);
        const prevPct = currentRecPct();
        if (isTypeB) {
          await recomputeTypeB(prevPct, data);
        } else {
          await recomputeTypeA(slots.checkedBaggage === true, bufferTimeMin, prevPct, data);
        }
      } catch {
        // 폴링 실패는 조용히 무시 — 다음 주기에 재시도
      }
    }, 60000); // 60초 주기
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, isTypeB, flightInfo?.flightNo]);

  return (
    <main className="min-h-screen bg-[#F3F5F8] text-[#1A1D23]">
      <Header current={questionIndex + 1} total={flowCards.length} />
      <div className="mx-auto max-w-lg px-4 py-6 flex flex-col gap-4">
        <div className="bg-[#10315C] text-white rounded-[12px] px-5 py-4">
          <p className="text-sm leading-relaxed">
            항공·철도 실시간 데이터로 <span className="font-semibold">열차 탑승 성공 확률</span>을
            알려드릴게요. 질문에 답하면 바로 계산해요.
          </p>
        </div>

        {cards.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="self-start text-sm text-[#6B7482] hover:text-[#1E63B8]"
          >
            ← 이전 질문
          </button>
        )}

        {cards.length === 0 && (
          <JourneyTypeCard onSelect={(type: JourneyType) => setSlots((s) => ({ ...s, journeyType: type }))} />
        )}

        {nextCard?.id === 'flight' && (
          <FlightCard
            direction={isTypeB ? 'dep' : 'arr'}
            onConfirmed={(info) => {
              setFlightInfo(info);
              setSlot('flightNo', info.flightNo, 'flight');
            }}
          />
        )}
        {nextCard?.id === 'destination' && !isTypeB && (
          <DestinationCard onSelect={(station) => setSlot('destinationStation', station, 'destination')} />
        )}
        {nextCard?.id === 'departureStation' && isTypeB && (
          <DepartureStationCard onSelect={(station) => setSlot('departureStation', station, 'departureStation')} />
        )}
        {nextCard?.id === 'cityTerminal' && isTypeB && (
          <CityTerminalCard onSelect={(v) => setSlot('cityTerminal', v, 'cityTerminal')} />
        )}
        {nextCard?.id === 'route' && isTypeC && (
          <RouteCard onSelect={(route) => setSlot('route', route, 'route')} />
        )}
        {nextCard?.id === 'wishTime' && isTypeC && (
          <WishTimeCard
            onSelect={async (t) => {
              setSlot('wishTimeMin', t, 'wishTime');
              if (slots.route) await recomputeTypeC(t, slots.route);
            }}
          />
        )}
        {nextCard?.id === 'baggage' && !isTypeC && (
          <BaggageCard onSelect={(v) => setSlot('checkedBaggage', v, 'baggage')} />
        )}
        {nextCard?.id === 'passport' && !isTypeC && (
          <PassportCard onSelect={(v) => setSlot('passport', v, 'passport')} />
        )}
        {nextCard?.id === 'buffer' && flightInfo && (
          <BufferCard
            estimateMinutes={
              isTypeB
                ? estimateDepartureMinutes(slots.cityTerminal === true, flightInfo.isDomestic)
                : estimateExitMinutes(flightInfo, slots.checkedBaggage === true)
            }
            variant={isTypeB ? 'departure' : 'arrival'}
            onSelect={finish}
          />
        )}

        {loading && <p className="text-center text-sm text-[#6B7482]">확률을 계산하는 중…</p>}

        {/* Phase 7: 지연 알림 배너 — 10%p 이상 하락 시에만 */}
        {alertMsg && (
          <div className="bg-[#B3271E] text-white rounded-[12px] px-5 py-3 text-sm font-medium">
            {alertMsg}
          </div>
        )}

        {results && flightInfo && !isTypeB && !isTypeC && (
          <ResultCard
            scenarios={results}
            activeScenarioId={activeScenarioId}
            baggageChecked={baggageChecked}
            bufferTimeMin={bufferTimeMin}
            baseTimeMin={flightInfo.scheduledArrivalMin}
            onSelectScenario={setActiveScenarioId}
            onToggleBaggage={async () => {
              const next = !baggageChecked;
              setBaggageChecked(next);
              await recomputeTypeA(next, bufferTimeMin);
            }}
          />
        )}

        {typeBResults && flightInfo && isTypeB && (
          <TypeBResultCard
            scenarios={typeBResults}
            departureStation={slots.departureStation ?? ''}
            deadlineMin={flightInfo.boardingDeadlineMin ?? flightInfo.scheduledArrivalMin - 40}
          />
        )}

        {typeCResult && isTypeC && slots.route && slots.wishTimeMin && (
          <TypeCResultCard
            scenario={typeCResult}
            route={slots.route}
            wishTimeMin={slots.wishTimeMin}
            nowMin={Math.floor(Date.now() / 60000)}
          />
        )}

        {/* §9 관광: 결과 화면이 실제로 표시된 뒤, 여유 30분 이상일 때만 노출.
            (buffer 질문 단계에선 이전 잔여 상태로 뜨지 않도록 결과 존재를 함께 체크) */}
        {hasResult && tourSlackMin >= 30 && (
          <InterestCard slackMin={tourSlackMin} recTrainNo={tourRecTrainNo ?? '추천 열차'} onSelect={pickInterest} />
        )}
        {hasResult && interest && tourCourses.length > 0 && (
          <TourListCard courses={tourCourses} remainingMin={tourSlackMin} category={interest} />
        )}
        {hasResult && interest && tourCourses.length === 0 && (
          <p className="text-sm text-[#B0730A]">
            {tourSlackMin}분 안에 다녀올 수 있는 {interest === 'cafe' ? '카페' : interest === 'history' ? '역사·문화' : '자연·공원'} 코스가 없어요.
          </p>
        )}

        {/* Phase 7: 데모 전용 지연 시뮬레이션 트리거 (유형 C 제외 — 항공 무관) */}
        {!isTypeC && flightInfo && (results || typeBResults) && (
          <div className="self-center flex items-center gap-2">
            <button
              type="button"
              onClick={simulateDelay}
              className="text-xs text-[#6B7482] border border-[#DCE2EA] rounded-full px-3 py-1.5 hover:bg-[#E9F0FA]"
              title="데모용: 항공 지연 +15~25분 시뮬레이션"
            >
              ⚡ 지연 발생 시뮬레이션{simDelay > 0 ? ` (+${simDelay}분)` : ''}
            </button>
            <span className="text-[10px] text-[#6B7482]">데모용 — 실제로는 자동으로 감지됩니다</span>
          </div>
        )}
      </div>
    </main>
  );
}
