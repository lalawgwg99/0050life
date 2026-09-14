import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

html_old = """        <div class="fields-grid">
          <!-- 模板選擇器 -->
          <div class="field-cell field-full">
            <div class="field-header">
              <span class="field-label">投資配置組合模板</span>
              <span class="field-badge-note" id="tagNetReturn">實質淨年化 7.80%</span>
            </div>
            <div class="input-wrapper">
              <select id="portfolioPreset" class="apple-select" onchange="applyPortfolioPreset()">
                <option value="tw_us_flagship" selected>台美大盤旗艦型（0050 / 006208 80% ＋ VOO 20% ｜ 年化 8.0%、費用 0.20%）</option>
                <option value="world_passive">全球全市場被動型（VT / VWRA ｜ 年化 7.5%、費用 0.22%）</option>
                <option value="us_sp500">純美股標普 500（VOO / SPY ｜ 年化 9.0%、費用 0.08%）</option>
                <option value="high_div">高股息 / 存股型（0056 / 00878 等 ｜ 年化 6.0%、費用 0.60%）</option>
                <option value="defensive">穩健防禦型（股 60% ＋ 債 40% ｜ 年化 5.5%、費用 0.15%）</option>
                <option value="custom">完全自訂（手動輸入下方數值）</option>
              </select>
            </div>
          </div>"""

html_new = """        <div class="fields-grid">
          <!-- 新版：資產配置視覺化選擇器 -->
          <div class="field-cell field-full">
            <div class="field-header">
              <span class="field-label">投資組合配置 (資產配方)</span>
              <span class="field-badge-note" id="tagNetReturn">實質淨年化 7.80%</span>
            </div>
            
            <div class="portfolio-chips-container" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
              <button type="button" class="port-chip active" onclick="setPortfolio('tw_us_flagship', this)">
                <span class="chip-icon">⚖️</span>台美旗艦 (股100)
              </button>
              <button type="button" class="port-chip" onclick="setPortfolio('us_sp500', this)">
                <span class="chip-icon">🇺🇸</span>純美股 (標普500)
              </button>
              <button type="button" class="port-chip" onclick="setPortfolio('tw_0050', this)">
                <span class="chip-icon">🇹🇼</span>純台股 (0050)
              </button>
              <button type="button" class="port-chip" onclick="setPortfolio('world_passive', this)">
                <span class="chip-icon">🌍</span>全球大盤 (VT)
              </button>
              <button type="button" class="port-chip" onclick="setPortfolio('balance_8020', this)">
                <span class="chip-icon">🛡️</span>股債平衡 (股80/債20)
              </button>
              <button type="button" class="port-chip" onclick="setPortfolio('custom', this)">
                <span class="chip-icon">⚙️</span>自訂回報
              </button>
            </div>
            <input type="hidden" id="portfolioPreset" value="tw_us_flagship">
            
            <!-- 選中配方的細節說明 -->
            <div class="pension-desc-note" id="portfolioDesc" style="margin-top:0; font-size:13px; background:#F9F9FB; border-left-color:var(--text-secondary);">
              <strong>台美大盤旗艦型：</strong>80% 台灣 0050/006208 搭配 20% 美股 VOO。兼顧台股免稅優勢與美股全球影響力。（預期年化 8.0%，內扣 0.20%）
            </div>
          </div>"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(html_old, html_new)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Pillar 3 UI upgraded!")
