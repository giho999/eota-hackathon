'use client';

import { useEffect, useRef } from 'react';
import type * as L from 'leaflet';
import type { TourSpot } from '@/lib/adapters';

interface SpotMapProps {
  spots: TourSpot[];
  center: { lat: number; lng: number; label: string };
}

/** Leaflet + OSM 지도. 스팟 마커 + 클릭 팝업 (이름·카테고리·도보시간).
 *  ponytail: 기본 마커 아이콘은 번들 이슈로 404 → L.divIcon 텍스트 마커 사용.
 *  React 19 StrictMode는 useEffect를 2회 실행 — 내부 생성/정리를 동기적으로 격리. */
export default function SpotMap({ spots, center }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    import('leaflet').then((L) => {
      // StrictMode 2회차: 기존 지도가 남아 있으면 제거 후 재생성
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(container).setView([center.lat, center.lng], 14);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.marker([center.lat, center.lng], { icon: L.divIcon({ html: '🚉', className: 'text-xl' }) })
        .addTo(map)
        .bindPopup(`<b>${center.label}</b>`)
        .openPopup();

      spots.forEach((spot, i) => {
        const lat = spot.lat ?? center.lat + (i % 3) * 0.002 - 0.002;
        const lng = spot.lng ?? center.lng + Math.floor(i / 3) * 0.002 - 0.002;
        const cat = spot.category === 'cafe' ? '카페' : spot.category === 'history' ? '역사·문화' : '자연·공원';
        L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style="background:#1E63B8;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;">${i + 1}</div>`,
            className: '',
          }),
        })
          .addTo(map)
          .bindPopup(`<b>${spot.name}</b><br/>${cat} · 도보 ${spot.walkMin}분`);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [spots, center]);

  return <div ref={containerRef} className="h-56 w-full rounded-[12px] z-0" />;
}
