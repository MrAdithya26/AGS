const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/guide.html'); await p.waitForTimeout(800);
  await p.pdf({ path: 'AGS-Services-Master-Guide.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;color:#94A3B8;width:100%;padding:0 15mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>AGS Services Master v3.0 · Guide</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close();
})();
