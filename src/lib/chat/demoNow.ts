// 데모용 기준 시각 유틸. 쿼리 파라미터 ?now=ISO 로 발표 시각을 고정할 수 있다.
// 미지정 시 실제 현재 시각. epoch 분 단위로 반환.

let injectedNowMin: number | null = null;

/** 클라이언트에서 ?now=ISO 파라미터를 읽어 기준 시각을 주입 (데모 고정용). */
export function injectDemoNowFromQuery(search: string): void {
  const now = new URLSearchParams(search).get('now');
  if (!now) return;
  const d = new Date(now);
  if (!Number.isNaN(d.getTime())) injectedNowMin = Math.floor(d.getTime() / 60000);
}

/** 기준 시각(epoch 분). ?now= 로 주입된 시각이 있으면 그것, 없으면 실제 현재. */
export function nowMin(): number {
  return injectedNowMin ?? Math.floor(Date.now() / 60000);
}

export function clearDemoNow(): void {
  injectedNowMin = null;
}
