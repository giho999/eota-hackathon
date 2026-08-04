/* 08_alert_banner 재캡처: 배너가 뜨는 조합 탐색 → 배너 표시 순간 캡처 */
const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, 'docs', 'screenshots', '08_alert_banner.png');
const URL = 'https://eota-pi.vercel.app';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const COMBOS = [
  { baggage: '위탁 수하물 있음', passport: '외국인', buffer: '10분' },
  { baggage: '기내 수하물만', passport: '외국인', buffer: '10분' },
  { baggage: '위탁 수하물 있음', passport: '외국인', buffer: '20분' },
  { baggage: '위탁 수하물 있음', passport: '내국인', buffer: '10분' },
  { baggage: '기내 수하물만', passport: '내국인', buffer: '10분' },
  { baggage: '위탁 수하물 있음', passport: '내국인', buffer: '20분' },
];

async function flowToResult(page, combo) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await delay(2200);
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
  await page.getByRole('button', { name: combo.baggage }).click();
  await delay(2200);
  await page.getByRole('button', { name: combo.passport }).click();
  await delay(2200);
  await page.getByRole('button', { name: combo.buffer }).click();
  await delay(4000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  for (const combo of COMBOS) {
    await flowToResult(page, combo);
    const init = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/안전 추천[^\n]*\n[^\n]*\n?(\d+)%/);
      return m ? Number(m[1]) : null;
    });
    console.log(`[${combo.baggage}|${combo.passport}|${combo.buffer}] 초기 안전 추천: ${init}%`);

    // 안전 추천이 90%+일 때만 시뮬레이션 진행
    if (init === null || init < 90) {
      console.log('  → 90% 미만, 다음 조합');
      continue;
    }
    const simBtn = page.getByRole('button', { name: /지연 발생 시뮬레이션/ });
    let captured = false;
    for (let i = 0; i < 6; i++) {
      await simBtn.click();
      await delay(3500);
      const body = await page.evaluate(() => document.body.innerText);
      const m = body.match(/(지연이 발생해 성공 확률이[^\n]*)/);
      if (m) {
        console.log(`  → 클릭 ${i + 1}회: 배너 표시 [${m[1].slice(0, 60)}]`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(800);
        await page.screenshot({ path: OUT });
        captured = true;
        console.log('  → saved 08_alert_banner.png');
        break;
      }
      console.log(`  → 클릭 ${i + 1}회: 배너 없음`);
    }
    if (captured) break;
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
