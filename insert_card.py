import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

html_old = r'<div class="apple-segmented-control" id="segWithdrawalMode">\s*<button type="button" class="seg-btn active" id="btnModePerpetual" onclick="setWithdrawalMode\(\'perpetual\'\)">4% 永續傳承（本金不減）</button>\s*<button type="button" class="seg-btn" id="btnModeDeplete" onclick="setWithdrawalMode\(\'deplete\'\)">計畫提領（壽命終點歸零）</button>\s*</div>'

html_new = """<div class="apple-segmented-control" id="segWithdrawalMode" style="margin-bottom:12px;">
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
    
    content = re.sub(html_old, html_new, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Card inserted!")
