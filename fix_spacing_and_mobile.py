import re

files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

# 1. Section 1: Add quick chips to inflation
inflation_old = """          <!-- 長期年通膨率 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">長期年通膨率</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="inflation" class="apple-input" inputmode="decimal" value="2.0" step="0.1">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">主計總處長期 CPI 年增率中位數約 1.8%～2.2%</div>
          </div>"""

inflation_new = """          <!-- 長期年通膨率 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">長期年通膨率</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="inflation" class="apple-input" inputmode="decimal" value="2.0" step="0.1">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">主計總處長期 CPI 年增率中位數約 1.8%～2.2%</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickVal('inflation', 1.8)">1.8%</button>
              <button class="chip-btn" onclick="setQuickVal('inflation', 2.0)">2.0% (中位)</button>
              <button class="chip-btn" onclick="setQuickVal('inflation', 2.5)">2.5%</button>
              <button class="chip-btn" onclick="setQuickVal('inflation', 3.0)">3.0% (高估)</button>
            </div>
          </div>"""

# 2. Section 1: Make partTime full-width
parttime_old = """          <!-- 退休後微型兼職（今日幣值） -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">退休後微型兼職（今日幣值）</span>
            </div>"""

parttime_new = """          <!-- 退休後微型兼職（今日幣值） -->
          <div class="field-cell field-full">
            <div class="field-header">
              <span class="field-label">退休後微型兼職（今日幣值）</span>
            </div>"""

# 3. Section 1: Make SWR rate and Life Expectancy full-width & add SWR chips
swr_old = """          <!-- 子欄位 A：永續模式提領率 (SWR) -->
          <div class="field-cell" id="boxSwrRate">
            <div class="field-header">
              <span class="field-label">股票年化安全提領率 (SWR)</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="withdrawRate" class="apple-input" inputmode="decimal" value="4.0" step="0.1">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">國際 FIRE 基準：每年僅花股票收益，本金跨世代永續留存</div>
          </div>

          <!-- 子欄位 B：平滑享老模式預期壽命 (模型) -->
          <div class="field-cell" id="boxLifeExpectancy" style="display:none;">"""

swr_new = """          <!-- 子欄位 A：永續模式提領率 (SWR) -->
          <div class="field-cell field-full" id="boxSwrRate">
            <div class="field-header">
              <span class="field-label">股票年化安全提領率 (SWR)</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="withdrawRate" class="apple-input" inputmode="decimal" value="4.0" step="0.1">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">國際 FIRE 基準：每年僅花股票收益，本金跨世代永續留存</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 3.0)">3.0% (極致留本)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 3.5)">3.5% (穩健保守)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 4.0)">4.0% (國際經典)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 4.5)">4.5% (積極消費)</button>
            </div>
          </div>

          <!-- 子欄位 B：平滑享老模式預期壽命 (模型) -->
          <div class="field-cell field-full" id="boxLifeExpectancy" style="display:none;">"""

# 4. Section 2: Insert full-width container for Breakeven card
labor_grid_old = """          <!-- 目前累計年資 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">目前累計勞保年資</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="laborYearsNow" class="apple-input" inputmode="decimal" value="10" step="0.1">
              <span class="input-unit">年</span>
            </div>
            <div class="field-desc">可使用健保卡或行動認證，前往 <a href="https://edesk.bli.gov.tw/me/#/na/login" target="_blank" rel="noopener" class="apple-field-link">勞保局 e 化服務系統 ↗</a> 即時查詢實際年資</div>
          </div>

          <!-- 未來新增年資 -->"""

labor_grid_new = """          <!-- 目前累計年資 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">目前累計勞保年資</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="laborYearsNow" class="apple-input" inputmode="decimal" value="10" step="0.1">
              <span class="input-unit">年</span>
            </div>
            <div class="field-desc">可使用健保卡或行動認證，前往 <a href="https://edesk.bli.gov.tw/me/#/na/login" target="_blank" rel="noopener" class="apple-field-link">勞保局 e 化服務系統 ↗</a> 即時查詢實際年資</div>
          </div>

          <!-- 獨立全寬展示：勞保請領「黃金交叉平衡點」精算 -->
          <div class="field-cell field-full" id="boxLaborBreakeven" style="margin-top: -4px;"></div>

          <!-- 未來新增年資 -->"""

# 5. Section 4: Add quick chips to assetsNow
assets_old = """          <!-- 現有投資部位 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">現有投資部位總現值</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="assetsNow" class="apple-input" inputmode="numeric" value="500000" step="10000">
              <span class="input-unit">元</span>
            </div>
            <div class="field-desc">目前證券戶股票、ETF 或基金現值，尚未投資填 0</div>
          </div>"""

assets_new = """          <!-- 現有投資部位 -->
          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">現有投資部位總現值</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="assetsNow" class="apple-input" inputmode="numeric" value="500000" step="10000">
              <span class="input-unit">元</span>
            </div>
            <div class="field-desc">目前證券戶股票、ETF 或基金現值，尚未投資填 0</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickVal('assetsNow', 0)">0 元</button>
              <button class="chip-btn" onclick="setQuickVal('assetsNow', 500000)">50 萬</button>
              <button class="chip-btn" onclick="setQuickVal('assetsNow', 1000000)">100 萬</button>
              <button class="chip-btn" onclick="setQuickVal('assetsNow', 3000000)">300 萬</button>
              <button class="chip-btn" onclick="setQuickVal('assetsNow', 5000000)">500 萬</button>
            </div>
          </div>"""

# 6. Section 6: Symmetrical chips for Pledge Amount & Pledge Rate
pledge_old = """          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">自訂借款金額</span>
              <span class="field-badge-note" id="badgePledgeLTV" style="background:#E0F7F8; color:#00C2C7;">LTV 0%</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="pledgeAmount" class="apple-input" inputmode="numeric" value="1000000" step="100000" oninput="calculate()">
              <span class="input-unit">元</span>
            </div>
            <div class="field-desc">直接設定欲借款的絕對金額，系統會依退休總資產自動換算風險</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.2)">借 2 成</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.3)">借 3 成</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.4)">借 4 成</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.5)">借 5 成</button>
            </div>
          </div>

          <div class="field-cell" id="boxPledgeRate" style="display:none;">
            <div class="field-header">
              <span class="field-label">質押借款年利率</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="pledgeRate" class="apple-input" inputmode="decimal" value="2.5" step="0.1" oninput="calculate()">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">券商牌告質押年息約 2.3%～3.0%</div>
          </div>"""

pledge_new = """          <div class="field-cell">
            <div class="field-header">
              <span class="field-label">自訂借款金額</span>
              <span class="field-badge-note" id="badgePledgeLTV" style="background:#E0F7F8; color:#00C2C7;">LTV 0%</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="pledgeAmount" class="apple-input" inputmode="numeric" value="1000000" step="100000" oninput="calculate()">
              <span class="input-unit">元</span>
            </div>
            <div class="field-desc">直接設定欲借款的絕對金額，系統會依退休總資產自動換算風險</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.2)">20% (安全)</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.3)">30% (適中)</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.4)">40% (積極)</button>
              <button class="chip-btn" onclick="setQuickPledgeLTV(0.5)">50% (上限)</button>
            </div>
          </div>

          <div class="field-cell" id="boxPledgeRate" style="display:none;">
            <div class="field-header">
              <span class="field-label">質押借款年利率</span>
            </div>
            <div class="input-wrapper">
              <input type="number" id="pledgeRate" class="apple-input" inputmode="decimal" value="2.5" step="0.1" oninput="calculate()">
              <span class="input-unit">%</span>
            </div>
            <div class="field-desc">券商牌告質押年息約 2.3%～3.0%</div>
            <div class="quick-chips">
              <button class="chip-btn" onclick="setQuickVal('pledgeRate', 2.3)">2.3%</button>
              <button class="chip-btn" onclick="setQuickVal('pledgeRate', 2.5)">2.5% (常見)</button>
              <button class="chip-btn" onclick="setQuickVal('pledgeRate', 2.8)">2.8%</button>
              <button class="chip-btn" onclick="setQuickVal('pledgeRate', 3.0)">3.0%</button>
            </div>
          </div>"""

# 7. JS update: render breakeven card to boxLaborBreakeven
js_breakeven_old = """      // 附帶黃金交叉與法定 CPI 抗通膨說明
      $('claimAgeHint').innerHTML += '<div class="breakeven-card">' +"""

js_breakeven_new = """      // 附帶黃金交叉與法定 CPI 抗通膨說明
      const breakevenHtml = '<div class="breakeven-card" style="margin-top:0;">' +
        '<div class="breakeven-header">' +
          '<span>勞保請領「黃金交叉平衡點」精算</span>' +
          '<span class="breakeven-badge">平衡年齡約 ' + breakevenAge + ' 歲</span>' +
        '</div>' +
        '<div class="breakeven-track">' +
          '<div class="breakeven-bar-early" style="width:55%;" title="60歲早領先行優勢"></div>' +
          '<div class="breakeven-bar-normal" style="width:45%;" title="' + breakevenAge + '歲後足額領累計更多"></div>' +
        '</div>' +
        '<div class="breakeven-labels">' +
          '<span style="text-align:left;">前段優勢：60歲起早領先存</span>' +
          '<span style="text-align:right;">後段優勢：' + breakevenAge + '歲起足額領超越</span>' +
        '</div>' +
        '<div style="font-size:11px; color:var(--label-tertiary); margin-top:6px; line-height:1.4;">' +
          'ⓘ 勞保享有法定通膨調整（累計 CPI 達 5% 同步調升給付），能有效抗衡長線物價侵蝕。' +
        '</div>' +
      '</div>';
      if ($('boxLaborBreakeven')) {
        $('boxLaborBreakeven').innerHTML = breakevenHtml;
      } else {
        $('claimAgeHint').innerHTML += breakevenHtml;
      }
      if (false) $('claimAgeHint').innerHTML += '<div class="breakeven-card">' +"""

# 8. Mobile touch & tactile feedback CSS enhancements
css_mobile_enhancement = """
    /* 觸覺回饋與手機操作優化 */
    .chip-btn {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .chip-btn:active {
      transform: scale(0.95);
      background-color: var(--accent);
      color: #fff;
    }
    .port-chip {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .port-chip:active {
      transform: scale(0.96);
    }
    .apple-card {
      transition: box-shadow 0.2s;
    }
    @media (max-width: 480px) {
      .apple-card {
        padding: 20px 16px !important;
        border-radius: 16px !important;
        margin-bottom: 12px !important;
      }
      .quick-chips {
        gap: 6px !important;
      }
      .chip-btn {
        min-height: 34px !important;
        font-size: 12.5px !important;
        padding: 6px 12px !important;
      }
      .field-desc {
        font-size: 11.5px !important;
        line-height: 1.4 !important;
      }
    }
"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(inflation_old, inflation_new)
    content = content.replace(parttime_old, parttime_new)
    content = content.replace(swr_old, swr_new)
    content = content.replace(labor_grid_old, labor_grid_new)
    content = content.replace(assets_old, assets_new)
    content = content.replace(pledge_old, pledge_new)
    content = content.replace(js_breakeven_old, js_breakeven_new)

    if '/* 觸覺回饋與手機操作優化 */' not in content:
        content = content.replace('</style>', css_mobile_enhancement + '\n</style>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Layout spacing and mobile UX updated successfully!")
