import re

files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

# 1. Section 1: Add conflict notice placeholder to boxSwrRate
swr_box_old = """          <!-- 子欄位 A：永續模式提領率 (SWR) -->
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
          </div>"""

swr_box_new = """          <!-- 子欄位 A：永續模式提領率 (SWR) -->
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
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 2.5)">2.5% (質押安全)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 3.0)">3.0% (極致留本)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 3.5)">3.5% (穩健保守)</button>
              <button class="chip-btn" onclick="setQuickVal('withdrawRate', 4.0)">4.0% (國際經典)</button>
            </div>
            <div id="swrPledgeConflictNotice" style="display:none; font-size:12px; color:#991B1B; background:#FEF2F2; border:1px solid #FECACA; padding:8px 12px; border-radius:8px; margin-top:8px; line-height:1.4;"></div>
          </div>"""

# 2. Section 6: Add boxPledgeSWRWarning to pledge dashboard
pledge_dash_old = """          <div class="pledge-dash-footer" id="txtPledgeWarning">
            ⓘ 當股票市值下跌 X%，維持率低於 130% 時，將面臨券商追繳斷頭風險。
          </div>"""

pledge_dash_new = """          <!-- 實質負擔率與 4% 法則衝突警示卡片 -->
          <div id="boxPledgeSWRWarning" style="display:none; margin-top:10px; padding:10px 12px; border-radius:8px; font-size:12px; line-height:1.5;"></div>
          
          <div class="pledge-dash-footer" id="txtPledgeWarning">
            ⓘ 當股票市值下跌 X%，維持率低於 130% 時，將面臨券商追繳斷頭風險。
          </div>"""

# 3. Validation inside calculate()
calc_top_old = """  function calculate(isSettingBaseline = false) {
    // 防呆：勞保必須「退保」才能起領，因此起領年齡不得低於停止工作(退保)年齡
    if (n('claimAge') < n('retireAge')) {
      $('claimAge').value = $('retireAge').value;
      // 可以在這裡加入閃爍動畫提示使用者
      $('claimAge').style.transition = 'background-color 0.3s';
      $('claimAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('claimAge').style.backgroundColor = '', 600);
    }
    
    const age = n('currentAge');"""

calc_top_new = """  function calculate(isSettingBaseline = false) {
    const age = n('currentAge') || 44;
    
    // ── 全面防呆邊界檢核 ──
    // 1. 退休年齡不得早於目前實歲
    if (n('retireAge') < age) {
      $('retireAge').value = age;
      $('retireAge').style.transition = 'background-color 0.3s';
      $('retireAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('retireAge').style.backgroundColor = '', 600);
    }
    
    // 2. 勞保起領年齡法規限制：60 ～ 70 歲，且不得早於退休退保年齡
    let claim = n('claimAge');
    if (claim < 60) {
      $('claimAge').value = 60;
      claim = 60;
    } else if (claim > 70) {
      $('claimAge').value = 70;
      claim = 70;
    }
    if (claim < n('retireAge')) {
      $('claimAge').value = $('retireAge').value;
      $('claimAge').style.transition = 'background-color 0.3s';
      $('claimAge').style.backgroundColor = '#FFE5E5';
      setTimeout(() => $('claimAge').style.backgroundColor = '', 600);
    }"""

# 4. In calculate(): pledge SWR conflict computation and warnings
pledge_render_target = """      if ($('txtPledgeWarning')) {
        $('txtPledgeWarning').innerHTML = 'ⓘ 若股市從高點下跌 <strong style="color:var(--system-red);">' + R.marginCallDrop + '%</strong>，維持率跌破 130% 時，將面臨券商追繳斷頭風險。';
      }
    }"""

pledge_render_replacement = """      if ($('txtPledgeWarning')) {
        $('txtPledgeWarning').innerHTML = 'ⓘ 若股市從高點下跌 <strong style="color:var(--system-red);">' + R.marginCallDrop + '%</strong>，維持率跌破 130% 時，將面臨券商追繳斷頭風險。';
      }

      // ── 質押槓桿與 4% 法則衝突精算 ──
      const annualLiving = R.monthlySWRIncome * 12;
      const annualInterest = R.monthlyPledgeInterest * 12;
      const effectiveBurden = R.netStockEquity > 0 ? ((annualLiving + annualInterest) / R.netStockEquity * 100) : 0;
      
      const warnBox = $('boxPledgeSWRWarning');
      if (warnBox) {
        if (pledgeStrategy === 'leverage' && R.actualPledgeLoan > 0) {
          if (effectiveBurden > 4.5 || swr > 0.035) {
            warnBox.style.display = 'block';
            warnBox.style.background = '#FEF2F2';
            warnBox.style.border = '1px solid #FECACA';
            warnBox.style.color = '#991B1B';
            warnBox.innerHTML = '⚠️ <strong>提領超載警示（質押與 4% 法則衝突）：</strong><br>' +
              '您目前名目提領率設定為 <strong>' + (swr * 100).toFixed(1) + '%</strong>，加計借款利息後，對「自有淨值」的<strong>實質負擔率高達 ' + effectiveBurden.toFixed(1) + '%</strong>（已衝破 4% 安全上限）！<br>' +
              '若退休初期遭遇大盤股災，將面臨本金快速侵蝕與追加保證金風險。建議：(1) 將提領率調降至 <strong>2.5%～3.0%</strong>，或 (2) 將質押借款降至 <strong>20% 以下</strong>。';
          } else {
            warnBox.style.display = 'block';
            warnBox.style.background = '#F0FDF4';
            warnBox.style.border = '1px solid #BBF7D0';
            warnBox.style.color = '#166534';
            warnBox.innerHTML = '✅ <strong>防守型安全槓桿：</strong>加計利息後對自有本金的實質負擔率為 <strong>' + effectiveBurden.toFixed(1) + '%</strong>，維持率達 <strong>' + R.maintenanceMargin + '%</strong>，能承受大盤下跌 <strong>' + R.marginCallDrop + '%</strong> 不被斷頭。';
          }
        } else if (pledgeStrategy === 'cashflow') {
          warnBox.style.display = 'block';
          warnBox.style.background = '#EFF6FF';
          warnBox.style.border = '1px solid #BFDBFE';
          warnBox.style.color = '#1E40AF';
          warnBox.innerHTML = '💡 <strong>避難備用金模式：</strong>借款部位作為流動性水庫，未投入股市擴張槓桿。每月利息支出約 <strong>' + fmtMoney(R.monthlyPledgeInterest) + '</strong>，平時建議由 0050/VOO 自然配息直接扣抵。';
        } else {
          warnBox.style.display = 'none';
        }
      }

      // 連動 Section 1 的 SWR 提領率提示
      const swrNotice = $('swrPledgeConflictNotice');
      if (swrNotice) {
        if (enablePledge && pledgeStrategy === 'leverage' && R.actualPledgeLoan > 0 && swr > 0.035) {
          swrNotice.style.display = 'block';
          swrNotice.innerHTML = '⚠️ <strong>已啟用質押買股</strong>：加計借款利息後，實質資產負擔率達 <strong>' + effectiveBurden.toFixed(1) + '%</strong>。依三一研究安全模型，強烈建議將此處提領率調降至 <strong>2.5%～3.0%</strong>。';
        } else {
          swrNotice.style.display = 'none';
        }
      }
    }"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(swr_box_old, swr_box_new)
    content = content.replace(pledge_dash_old, pledge_dash_new)
    content = content.replace(calc_top_old, calc_top_new)
    content = content.replace(pledge_render_target, pledge_render_replacement)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Comprehensive guardrails added successfully!")
