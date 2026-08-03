import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '이어타 (EOTA)',
  description: '항공·철도 환승 성공 확률 예측 챗봇',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
