/* 08_alert_banner: 배너 표시 순간 캡처 (로컬 검증 → 배포 URL) */
const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, 'docs', 'screenshots', '08_alert_banner.png');
const URL = process.env.CAP_URL || 'https://eota-pi.vercel.app';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await delay(2500);
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

  const simBtn = page.getByRole('button', { name: /지연 발생 시뮬레이션/ });
  let bannerText = '';
  for (let i = 0; i < 8; i++) {
    await simBtn.click();
    await delay(3500);
    bannerText = await page.evaluate(() => (document.body.innerText.match(/지연이 발생해[^\n]*/) || [''])[0]);
    if (bannerText) {
      console.log(`클릭 ${i + 1}회 후 배너:`, bannerText);
      break;
    }
  }
  if (!bannerText) {
    console.log('경고: 배너 미표시');
    process.exit(1);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(800);
  await page.screenshot({ path: OUT });
  console.log('saved 08_alert_banner.png');

  const finalText = await page.evaluate(() => document.body.innerText);
  console.log('캡처 시점 배너 존재:', finalText.includes('로 떨어졌어요'));
  console.log('배너 문구:', (finalText.match(/지연이 발생해[^\n]*/) || ['없음'])[0]);
  await browser.close();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
