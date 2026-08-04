/* 모바일 너비별 열차 카드 레이아웃 검증 — 320/390/428px */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'docs', 'screenshots', 'responsive');
const URL = 'https://eota-pi.vercel.app';
fs.mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function flowTypeA(page) {
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
  await page.getByRole('button', { name: '타이트하게' }).click();
  await delay(3500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(800);
}

// 줄바꿈 검증: '오전/오후' 뒤에 단어 중간 절단이 있는지 (예: "오\n전" 패턴)
async function checkBreaks(page) {
  return page.evaluate(() => {
    const issues = [];
    const seen = new Set();
    document.querySelectorAll('span, p').forEach((el) => {
      const text = el.childNodes.length > 0 ? Array.from(el.childNodes).map((n) => n.textContent).join('') : '';
      const rects = [];
      // 텍스트가 여러 라인으로 나뉘는지 (getClientRects로 라인 수 확인)
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = [];
      let node;
      while ((node = walker.nextNode())) texts.push(node);
      if (texts.length === 0) return;
      let prevBottom = null;
      let broken = false;
      for (const t of texts) {
        range.selectNodeContents(t);
        const r = range.getBoundingClientRect();
        if (prevBottom !== null && Math.abs(r.top - prevBottom) > 1 && r.height > 0) {
          // 같은 요소의 텍스트가 2줄로 나뉘었고, 줄의 끝/시작이 한글 단어 중간인지
          const first = t.textContent.trim();
          if (first.length > 0 && /[가-힣]$/.test(first) && /[오전|오후]/.test(first.slice(-2))) {
            broken = true;
          }
        }
        if (r.height > 0) prevBottom = r.top + r.height;
      }
      if (broken) {
        const key = text.slice(0, 40);
        if (!seen.has(key)) {
          seen.add(key);
          issues.push(text.slice(0, 60));
        }
      }
    });
    return issues;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 428]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await delay(2200);

    // 유형 A 결과
    await flowTypeA(page);
    const aIssues = await checkBreaks(page);
    await page.screenshot({ path: path.join(OUT, `typeA_${width}.png`) });
    console.log(`[${width}px] typeA issues:`, aIssues.length ? JSON.stringify(aIssues) : '없음');

    // 유형 B 결과
    await page.goto(URL, { waitUntil: 'networkidle' });
    await delay(2200);
    await page.getByRole('button', { name: '기차 → 비행기' }).click();
    await delay(2200);
    await page.locator('input').fill('OZ301');
    await page.getByRole('button', { name: '확인' }).click();
    const confirmB = page.getByRole('button', { name: '맞아요, 이 항공편이에요' });
    for (let i = 0; i < 20; i++) {
      await delay(1000);
      if (await confirmB.isVisible().catch(() => false)) break;
    }
    await confirmB.click();
    await delay(2200);
    await page.locator('input').fill('대전');
    await page.getByRole('button', { name: '대전 → 대전역' }).click();
    await delay(2200);
    await page.getByRole('button', { name: '아니요, 공항에서 할게요' }).click();
    await delay(2200);
    await page.getByRole('button', { name: '기내 수하물만' }).click();
    await delay(2200);
    await page.getByRole('button', { name: '내국인' }).click();
    await delay(2200);
    await page.getByRole('button', { name: '30분' }).click();
    await delay(3500);
    const bIssues = await checkBreaks(page);
    await page.screenshot({ path: path.join(OUT, `typeB_${width}.png`) });
    console.log(`[${width}px] typeB issues:`, bIssues.length ? JSON.stringify(bIssues) : '없음');

    await ctx.close();
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
