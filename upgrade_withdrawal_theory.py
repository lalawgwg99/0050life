import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

html_withdrawal_old = r'<div class="apple-segmented-control" style="margin-bottom:12px;">\s*<button type="button" class="seg-btn active" id="btnModePerpetual" onclick="setWithdrawalMode\(\'perpetual\'\)">4% 永續傳承（本金不減）</button>\s*<button type="button" class="seg-btn" id="btnModeDeplete" onclick="setWithdrawalMode\(\'deplete\'\)">計畫提領（壽命終點歸零）</button>\s*</div>'

html_withdrawal_new = """<div class="apple-segmented-control" style="margin-bottom:12px;">
              <button type="button" class="seg-btn active" id="btnModePerpetual" onclick="setWithdrawalMode('perpetual')">4% 永續傳承（本金不減）</button>
              <button type="button" class="seg-btn" id="btnModeDeplete" onclick="setWithdrawalMode('deplete')">計畫提領（壽命終點歸零）</button>
            </div>
            
            <!-- 提領模型哲學動態解說卡片 -->
            <div class="pension-strategy-card" id="withdrawalStrategyCard" style="margin-top:0; margin-bottom:14px;">
              <div class="pension-strategy-header" style="margin-bottom:8px;">
                <span class="pension-strategy-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M2 12h4l2-9 5 18 3-9h6"/></svg>
                  <span>提領理論與財務運作邏輯</span>
                </span>
              </div>
              <div class="pension-desc-note" id="txtWithdrawalTheory" style="margin-top:0; font-size:12.5px;">
                載入中...
              </div>
            </div>"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace HTML
    content = re.sub(html_withdrawal_old, html_withdrawal_new, content)

    # Update setWithdrawalMode JS function
    js_update_logic = """
    if (mode === 'deplete') {
      if (btnPerp) btnPerp.classList.remove('active');
      if (btnDepl) btnDepl.classList.add('active');
      if (boxSwr) boxSwr.style.display = 'none';
      if (boxLife) boxLife.style.display = 'flex';
      if (tagMode) tagMode.textContent = '計畫提領（本金逐步歸零）';
      if ($('txtWithdrawalTheory')) {
        $('txtWithdrawalTheory').style.borderLeftColor = 'var(--system-orange)';
        $('txtWithdrawalTheory').style.backgroundColor = 'var(--system-orange-tint)';
        $('txtWithdrawalTheory').innerHTML = '<strong>【Die with Zero 破產上天堂】</strong><br>運用財務學「年金現值 (PV)」公式精算，將退休金連本帶利在預估壽命（如 85 歲）內按月平滑花光。<strong>因為連同本金一起提領，退休自備款門檻將大幅降低 30%~40%！</strong>適合不打算留遺產、想儘早財務自由的頂客族或單身族。';
      }
    } else {
      if (btnPerp) btnPerp.classList.add('active');
      if (btnDepl) btnDepl.classList.remove('active');
      if (boxSwr) boxSwr.style.display = 'flex';
      if (boxLife) boxLife.style.display = 'none';
      if (tagMode) tagMode.textContent = '4% 永續留本';
      if ($('txtWithdrawalTheory')) {
        $('txtWithdrawalTheory').style.borderLeftColor = 'var(--accent)';
        $('txtWithdrawalTheory').style.backgroundColor = 'rgba(0, 194, 199, 0.06)';
        $('txtWithdrawalTheory').innerHTML = '<strong>【F.I.R.E. 國際經典 4% 法則】</strong><br>基於美國三一大學研究（Trinity Study）。大盤長期名目報酬 7~10%，扣除 2~3% 長期通膨後，實質報酬約 5~7%。每年僅提領總資產的 4%，不僅生活費能<strong>隨通膨逐年調升</strong>，剩餘的 1~3% 報酬將持續滾動，達成<strong>「本金永不枯竭、跨世代傳承」</strong>的終極目標。';
      }
    }"""
    
    # We will just replace the inner if/else of setWithdrawalMode
    target_js_old = r"if \(mode === 'deplete'\) \{.*?if \(tagMode\) tagMode\.textContent = '4% 永續留本';\s*\}"
    content = re.sub(target_js_old, js_update_logic, content, flags=re.DOTALL)

    # For the "配息 vs 不配息" link, add a callout under Pillar 4 (自有投資組合) heading
    target_pillar_4 = r'<h2 class="card-title">📈 4\. 第三支柱：自有投資組合（ETF / 基金 / 股票）</h2>\s*<p class="card-subtitle">完全自主掌控的終身資產引擎。可選用經典配置模板，亦可完全自訂預期回報。</p>'
    replacement_pillar_4 = """<h2 class="card-title">📈 4. 第三支柱：自有投資組合（ETF / 基金 / 股票）</h2>
        <p class="card-subtitle">
          完全自主掌控的終身資產引擎。可選用經典配置模板，亦可完全自訂預期回報。<br>
          <a href="blog/dividend-vs-total-return.html" target="_blank" rel="noopener" class="apple-field-link" style="display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            迷思破解：高股息配息 vs 市值型大盤，我該選哪一個？ ↗
          </a>
        </p>"""
    content = re.sub(target_pillar_4, replacement_pillar_4, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Upgraded withdrawal theory UI and added blog link in {filepath}")

