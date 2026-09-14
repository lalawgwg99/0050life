import re

files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

# 1. Update HTML in boxStockDashboard
html_old = """          <div class="invest-bar-container">
            <div class="invest-bar-principal" id="barStockPrincipal" style="width: 50%;"></div>
            <div class="invest-bar-return" id="barStockReturn" style="width: 30%;"></div>
            <div class="invest-bar-pension" id="barStockPension" style="width: 20%;"></div>
          </div>
          
          <div class="invest-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #0284c7;"></div>
              <div>
                <div class="legend-label">自行投入本金</div>
                <div class="legend-value" id="valStockPrincipal">--</div>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #38bdf8;"></div>
              <div>
                <div class="legend-label">投資複利利得</div>
                <div class="legend-value" id="valStockReturn">--</div>
              </div>
            </div>
            <div class="legend-item" id="legendPension" style="display:none;">
              <div class="legend-color" style="background: var(--system-green);"></div>
              <div>
                <div class="legend-label">勞退一次領挹注</div>
                <div class="legend-value" id="valStockPension">--</div>
              </div>
            </div>
          </div>"""

html_new = """          <div class="invest-bar-container">
            <div class="invest-bar-principal" id="barStockPrincipal" style="width: 40%;"></div>
            <div class="invest-bar-return" id="barStockReturn" style="width: 30%;"></div>
            <div class="invest-bar-pension" id="barStockPension" style="width: 15%; background: var(--system-green);"></div>
            <div class="invest-bar-house" id="barStockHouse" style="width: 0%; background: #F59E0B;"></div>
            <div class="invest-bar-pledge" id="barStockPledge" style="width: 15%; background: #8B5CF6;"></div>
          </div>
          
          <div class="invest-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #0284c7;"></div>
              <div>
                <div class="legend-label">自行投入本金</div>
                <div class="legend-value" id="valStockPrincipal">--</div>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #38bdf8;"></div>
              <div>
                <div class="legend-label">投資複利利得</div>
                <div class="legend-value" id="valStockReturn">--</div>
              </div>
            </div>
            <div class="legend-item" id="legendPension" style="display:none;">
              <div class="legend-color" style="background: var(--system-green);"></div>
              <div>
                <div class="legend-label">勞退一次領挹注</div>
                <div class="legend-value" id="valStockPension">--</div>
              </div>
            </div>
            <div class="legend-item" id="legendHouse" style="display:none;">
              <div class="legend-color" style="background: #F59E0B;"></div>
              <div>
                <div class="legend-label">房產活化挹注</div>
                <div class="legend-value" id="valStockHouse">--</div>
              </div>
            </div>
            <div class="legend-item" id="legendPledge" style="display:none;">
              <div class="legend-color" style="background: #8B5CF6;"></div>
              <div>
                <div class="legend-label">質押再買入部位</div>
                <div class="legend-value" id="valStockPledge">--</div>
              </div>
            </div>
          </div>"""

# 2. Update JS rendering in calculate()
js_old = """    // ── 渲染：股票總資產明細 (Third Pillar Dashboard) ──
    const totalPrincipal = n('assetsNow') + (n('monthlyInvest') * monthsToRetire);
    const compoundedReturn = projectedStockAssets - totalPrincipal;
    const isLumpSum = (pensionMode === 'lump');
    
    const stockTotalVal = projectedStockAssets + (isLumpSum ? projectedPensionLump : 0);
    
    if ($('valStockTotal')) $('valStockTotal').textContent = fmtMoney(stockTotalVal);
    if ($('valStockPrincipal')) $('valStockPrincipal').textContent = fmtMoney(totalPrincipal);
    if ($('valStockReturn')) $('valStockReturn').textContent = fmtMoney(compoundedReturn);
    
    let wP = (totalPrincipal / stockTotalVal) * 100;
    let wR = (compoundedReturn / stockTotalVal) * 100;
    let wL = isLumpSum ? ((projectedPensionLump / stockTotalVal) * 100) : 0;
    
    if ($('barStockPrincipal')) $('barStockPrincipal').style.width = wP + '%';
    if ($('barStockReturn')) $('barStockReturn').style.width = wR + '%';
    if ($('barStockPension')) $('barStockPension').style.width = wL + '%';
    
    if ($('legendPension')) $('legendPension').style.display = isLumpSum ? 'flex' : 'none';
    if (isLumpSum && $('valStockPension')) $('valStockPension').textContent = fmtMoney(projectedPensionLump);"""

js_new = """    // ── 渲染：股票總資產明細 (Third Pillar Dashboard) ──
    const totalPrincipal = n('assetsNow') + (n('monthlyInvest') * monthsToRetire);
    const compoundedReturn = Math.max(0, projectedStockAssets - totalPrincipal);
    const isLumpSum = (pensionMode === 'lump');
    const pledgeLeverageStock = (enablePledge && pledgeStrategy === 'leverage') ? R.actualPledgeLoan : 0;
    const houseStockAddon = downsizingCashToStock + extraMortgageStock;
    
    // 真正持有的股票總市值（含自有累積、勞退一次領、房產活化挹注、以及質押擴張再買股部位）
    const stockTotalVal = R.totalPortfolioValue;
    
    if ($('valStockTotal')) $('valStockTotal').textContent = fmtMoney(stockTotalVal);
    if ($('valStockPrincipal')) $('valStockPrincipal').textContent = fmtMoney(totalPrincipal);
    if ($('valStockReturn')) $('valStockReturn').textContent = fmtMoney(compoundedReturn);
    
    let wP = stockTotalVal > 0 ? (totalPrincipal / stockTotalVal) * 100 : 0;
    let wR = stockTotalVal > 0 ? (compoundedReturn / stockTotalVal) * 100 : 0;
    let wL = (isLumpSum && stockTotalVal > 0) ? ((projectedPensionLump / stockTotalVal) * 100) : 0;
    let wH = (houseStockAddon > 0 && stockTotalVal > 0) ? ((houseStockAddon / stockTotalVal) * 100) : 0;
    let wPL = (pledgeLeverageStock > 0 && stockTotalVal > 0) ? ((pledgeLeverageStock / stockTotalVal) * 100) : 0;
    
    if ($('barStockPrincipal')) $('barStockPrincipal').style.width = wP + '%';
    if ($('barStockReturn')) $('barStockReturn').style.width = wR + '%';
    if ($('barStockPension')) $('barStockPension').style.width = wL + '%';
    if ($('barStockHouse')) $('barStockHouse').style.width = wH + '%';
    if ($('barStockPledge')) $('barStockPledge').style.width = wPL + '%';
    
    if ($('legendPension')) $('legendPension').style.display = isLumpSum ? 'flex' : 'none';
    if (isLumpSum && $('valStockPension')) $('valStockPension').textContent = fmtMoney(projectedPensionLump);

    if ($('legendHouse')) $('legendHouse').style.display = houseStockAddon > 0 ? 'flex' : 'none';
    if (houseStockAddon > 0 && $('valStockHouse')) $('valStockHouse').textContent = fmtMoney(houseStockAddon);

    if ($('legendPledge')) $('legendPledge').style.display = pledgeLeverageStock > 0 ? 'flex' : 'none';
    if (pledgeLeverageStock > 0 && $('valStockPledge')) $('valStockPledge').textContent = fmtMoney(pledgeLeverageStock);"""

# 3. Synchronize valProjected to totalPortfolioValue
valproj_old = "$('valProjected').textContent = fmtMoney(R.netStockEquity);"
valproj_new = "$('valProjected').textContent = fmtMoney(R.totalPortfolioValue);"

# 4. Make setQuickPledgeLTV auto-enable leverage
quick_pledge_old = """  function setQuickPledgeLTV(ratio) {
    if (window._lastBaseStockAssets) {
       $('pledgeAmount').value = Math.round(window._lastBaseStockAssets * ratio);
       calculate();
    }
  }"""

quick_pledge_new = """  function setQuickPledgeLTV(ratio) {
    if ($('pledgeStrategy') && $('pledgeStrategy').value === 'none') {
      $('pledgeStrategy').value = 'leverage';
      togglePledgeFields();
    }
    if (window._lastBaseStockAssets) {
       $('pledgeAmount').value = Math.round(window._lastBaseStockAssets * ratio);
       calculate();
    }
  }"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(html_old, html_new)
    content = content.replace(js_old, js_new)
    content = content.replace(valproj_old, valproj_new)
    content = content.replace(quick_pledge_old, quick_pledge_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Pledge in breakdown and synchronization fixed successfully!")
