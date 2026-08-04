/* 08_alert_banner 재캡처: 유형 A 결과 → 지연 시뮬레이션 반복 → 알림 배너 표시 순간 캡처 */
const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, 'docs', 'screenshots', '08_alert_banner.png');
const URL = 'https://eota-pi.vercel.app';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await delay(2500);

  // 유형 A → KE1234 (안전 추천 90%+ 보장) → 대전역 → 기내수하물 → 내국인 → 30분
  await page.getByRole('button', { name: '비행기 → 기차' }).click();
  await delay(2200);
  await page.locator('input').fill('KE1234');
  await page.getByRole('button', { name: '확인' }).click();
  const confirm = page.getByRole('button', { name: '맞아요, 이 항공편이에요' });
  for (let i = 0; i < 20; i++) {
    await delay(1000);
    if (await confirm.isVisible().catch(() => false)) break;
  }
  await confirm.click();
  await delay(2200);
  await page.locator('input').fill('대전');
  await page.getByRole('button', { name: '대전 → 대전역' }).click();
  await delay(2200);
  await page.getByRole('button', { name: '기내 수하물만' }).click();
  await delay(2200);
  await page.getByRole('button', { name: '내국인' }).click();
  await delay(2200);
  await page.getByRole('button', { name: '30분' }).click();
  await delay(4000);

  // 초기 안전 추천 확률 확인 (90%+ 목표)
  const initText = await page.evaluate(() => document.body.innerText);
  const initMatch = initText.match(/안전 추천[^\n]*\n[^\n]*\n?(\d+)%/);
  console.log('초기 화면 일부:', initText.slice(0, 250).replace(/\n/g, ' | '));

  // 지연 시뮬레이션 반복 클릭 → 배너("로 떨어졌어요") 표시 순간 포착
  const simBtn = page.getByRole('button', { name: /지연 발생 시뮬레이션/ });
  let bannerText = '';
  for (let i = 0; i < 8; i++) {
    await simBtn.click();
    await delay(3500);
    const body = await page.evaluate(() => document.body.innerText);
    const m = body.match(/(지연이 발생해[^\n]*떨어졌어요[^\n]*)/);
    if (m) {
      bannerText = m[1];
      console.log(`클릭 ${i + 1}회 후 배너 표시:`, bannerText);
      break;
    }
    console.log(`클릭 ${i + 1}회: 배너 아직 없음`);
  }
  if (!bannerText) {
    console.log('경고: 8회 클릭에도 배너 미표시 — 현재 화면 그대로 캡처');
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(800);
  await page.screenshot({ path: OUT });
  console.log('saved 08_alert_banner.png');

  // 배너 문구가 실제 스크린샷 타이밍에 존재했는지 최종 확인
  const finalText = await page.evaluate(() => document.body.innerText);
  const hasBanner = finalText.includes('로 떨어졌어요') || finalText.includes('지연이 발생');
  console.log('캡처 시점 배너 존재:', hasBanner);
  console.log('화면 텍스트 스니펫:', finalText.slice(0, 400).replace(/\n/g, ' | '));

  await browser.close();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
