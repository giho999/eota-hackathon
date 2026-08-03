import Card from './Card';
import type { JourneyType } from '@/lib/chat/slots';

interface JourneyTypeCardProps {
  onSelect: (type: JourneyType) => void;
}

const OPTIONS: { type: JourneyType; label: string; enabled: boolean }[] = [
  { type: 'A', label: '비행기 → 기차', enabled: true },
  { type: 'B', label: '기차 → 비행기', enabled: true },
  { type: 'C', label: '기차만', enabled: true },
];

export default function JourneyTypeCard({ onSelect }: JourneyTypeCardProps) {
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-3">어떤 여정인가요?</h2>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            type="button"
            disabled={!o.enabled}
            onClick={() => onSelect(o.type)}
            className="text-left px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA] btn-spring disabled:opacity-50 disabled:hover:bg-white"
          >
            {o.label}
            {!o.enabled && (
              <span className="ml-2 text-xs text-[#6B7482]">다음 Phase에서 제공</span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
