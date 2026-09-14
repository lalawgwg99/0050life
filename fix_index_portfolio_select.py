with open('/Users/jazzxx/Desktop/德人參/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_select_block = """          <!-- 模板選擇器 -->
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
                <option value="dividend_income">高股息配置型（00878 / 0056 / 00919 ｜ 年化 6.0%、費用 0.45%）</option>
                <option value="balanced_6040">經典股債平衡型（全球股票 60% ＋ 美國長債 40% ｜ 年化 5.5%、費用 0.30%）</option>
                <option value="custom">自訂投資組合（手動輸入下方報酬率與費用）</option>
              </select>
            </div>
          </div>"""

new_chips_block = """          <!-- 新版：資產配置視覺化選擇器 -->
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
            
            <!-- 智能 ETF 搜尋框 (僅在自訂模式顯示) -->
            <div id="boxEtfSearch" style="display:none; margin-top:12px; margin-bottom:8px; padding:12px; background:#FFFFFF; border:1px solid var(--border-color); border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
              <div style="font-size:12.5px; font-weight:600; color:var(--text-main); margin-bottom:6px;">內建 ETF 智慧字典（輸入代號自動帶入數據）</div>
              <div class="input-wrapper" style="position:relative;">
                <input type="text" id="etfSearchInput" class="apple-input" placeholder="🔍 試輸入: 0050, VOO, 00878..." style="padding-left: 12px;" autocomplete="off">
              </div>
              <div id="etfBadge" style="margin-top:8px; font-size:12.5px; font-weight:600; display:none; align-items:center; gap:6px;"></div>
            </div>
          </div>"""

if old_select_block in content:
    content = content.replace(old_select_block, new_chips_block)
    with open('/Users/jazzxx/Desktop/德人參/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("index.html select replaced successfully!")
else:
    print("Pattern not found in index.html!")
