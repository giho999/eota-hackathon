'use client';

import { useEffect, useRef, useState } from 'react';
import type { TourSpot } from '@/lib/adapters';

// ponytail: SDK는 <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false">
// 로 동적 로드하고 window.kakao.maps.load() 후 사용한다. 키 없으면 지도를 렌더링하지 않는다
// (리스트만 표시 — mock/live 폴백 원칙과 동일, 앱은 죽지 않음).
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';

interface SpotMapProps {
  spots: TourSpot[];
  center: { lat: number; lng: number; label: string };
}

// SDK 스크립트 1회 로드 + 준비 완료 Promise
let sdkPromise: Promise<void> | null = null;
function loadKakaoSdk(): Promise<void> {
  if (!KAKAO_KEY) return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_MAP_KEY 없음'));
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('browser only'));
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) return reject(new Error('kakao.maps 로드 실패'));
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** 카카오맵 지도. 역(🚉 CustomOverlay) + 코스 번호 마커 + 클릭 팝업.
 *  마커들이 한 화면에 들어오도록 setBounds() 자동 배율, 최소/최대 줌 레벨 제한. */
export default function SpotMap({ spots, center }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!KAKAO_KEY || typeof window === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !container) return;
        // StrictMode 2회차: 기존 지도/마커 정리 후 재생성
        clearMap();
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 5,
        });
        mapRef.current = map;
        drawMarkers(map);
      })
      .catch(() => {
        // 키 없음/로드 실패(403 등): 지도 영역 숨김 — 리스트만 표시 (폴백)
        setFailed(true);
      });

    return () => {
      cancelled = true;
      clearMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, center]);

  function clearMap() {
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];
    mapRef.current = null;
  }

  function drawMarkers(map: kakao.maps.Map) {
    const bounds = new kakao.maps.LatLngBounds();
    const centerLL = new kakao.maps.LatLng(center.lat, center.lng);
    bounds.extend(centerLL);

    // 역 마커: 🚉 CustomOverlay
    const stationOverlay = new kakao.maps.CustomOverlay({
      map,
      position: centerLL,
      content: `<div style="font-size:22px;line-height:1">🚉</div>`,
      yAnchor: 1,
    });
    overlaysRef.current.push(stationOverlay);

    // 코스 마커: 번호 CustomOverlay + 클릭 팝업
    spots.forEach((spot, i) => {
      const lat = spot.lat ?? center.lat + (i % 3) * 0.002 - 0.002;
      const lng = spot.lng ?? center.lng + Math.floor(i / 3) * 0.002 - 0.002;
      const ll = new kakao.maps.LatLng(lat, lng);
      bounds.extend(ll);
      const cat = spot.category === 'cafe' ? '카페' : spot.category === 'history' ? '역사·문화' : '자연·공원';
      const marker = new kakao.maps.Marker({ map, position: ll });
      markersRef.current.push(marker);
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: ll,
        content: `<div style="background:#1E63B8;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.3)">${i + 1}</div>`,
        yAnchor: 1,
      });
      overlaysRef.current.push(overlay);
      const info = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px 10px;font-size:13px;min-width:140px"><b>${spot.name}</b><br/><span style="color:#6B7482">${cat} · 도보 ${spot.walkMin}분</span></div>`,
      });
      kakao.maps.event.addListener(marker, 'click', () => info.open(map, marker));
    });

    // 자동 배율: 모든 마커가 화면 안에 들어오도록. 과확대(level 1~2)/과축소 방지.
    map.setBounds(bounds);
    const level = map.getLevel();
    const MIN_LEVEL = 3;
    const MAX_LEVEL = 7;
    if (level < MIN_LEVEL) map.setLevel(MIN_LEVEL);
    if (level > MAX_LEVEL) map.setLevel(MAX_LEVEL);
  }

  if (!KAKAO_KEY) return null; // 키 없음 → 리스트만 (폴백)
  if (failed) return null;     // SDK 로드 실패 → 리스트만 (폴백)
  return <div ref={containerRef} className="h-56 w-full rounded-[12px] overflow-hidden" />;
}
