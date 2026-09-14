import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

html_search_box = """            <!-- 選中配方的細節說明 -->
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
            </div>"""

js_smart_db = """
  // ── 智能 ETF 資料庫 (40+ 檔台灣/美國主流 ETF) ──
  const etfDB = {
    // 台股市值型
    '0050': { name: '元大台灣50', type: '台股市值大盤', ret: 8.5, fee: 0.43 },
    '006208': { name: '富邦台50', type: '台股市值大盤', ret: 8.5, fee: 0.15 },
    '00692': { name: '富邦公司治理', type: '台股ESG大盤', ret: 8.5, fee: 0.25 },
    '00850': { name: '元大臺灣ESG永續', type: '台股ESG大盤', ret: 8.5, fee: 0.40 },
    '00922': { name: '國泰台灣領袖50', type: '台股市值大盤', ret: 8.5, fee: 0.25 },
    '0051': { name: '元大中型100', type: '台股中小型', ret: 9.0, fee: 0.50 },
    
    // 台股高股息
    '0056': { name: '元大高股息', type: '台股高股息', ret: 7.0, fee: 0.45 },
    '00878': { name: '國泰永續高股息', type: '台股高股息', ret: 6.8, fee: 0.40 },
    '00713': { name: '元大台灣高息低波', type: '台股高股息', ret: 7.0, fee: 0.45 },
    '00919': { name: '群益台灣精選高息', type: '台股高股息', ret: 6.8, fee: 0.40 },
    '00929': { name: '復華台灣科技優息', type: '台股高股息', ret: 7.0, fee: 0.45 },
    '00939': { name: '統一台灣高息動能', type: '台股高股息', ret: 6.5, fee: 0.45 },
    '00940': { name: '元大台灣價值高息', type: '台股高股息', ret: 6.5, fee: 0.40 },
    '00900': { name: '富邦特選高股息30', type: '台股高股息', ret: 6.0, fee: 0.60 },

    // 台股主題型
    '0052': { name: '富邦科技', type: '台股科技型', ret: 10.0, fee: 0.45 },
    '00881': { name: '國泰台灣5G+', type: '台股科技型', ret: 9.5, fee: 0.40 },
    '00891': { name: '中信關鍵半導體', type: '台股半導體', ret: 10.0, fee: 0.45 },
    '00892': { name: '富邦台灣半導體', type: '台股半導體', ret: 10.0, fee: 0.45 },

    // 美股大盤 (海外原股)
    'VOO': { name: 'Vanguard 標普500', type: '美股大盤', ret: 9.5, fee: 0.03 },
    'SPY': { name: 'SPDR 標普500', type: '美股大盤', ret: 9.5, fee: 0.09 },
    'IVV': { name: 'iShares 標普500', type: '美股大盤', ret: 9.5, fee: 0.03 },
    'SPLG': { name: 'SPDR 標普500 (低價)', type: '美股大盤', ret: 9.5, fee: 0.02 },
    'VTI': { name: 'Vanguard 全美市場', type: '美股大盤', ret: 9.5, fee: 0.03 },
    'ITOT': { name: 'iShares 全美市場', type: '美股大盤', ret: 9.5, fee: 0.03 },
    
    // 美股科技與成長
    'QQQ': { name: 'Invesco 納斯達克100', type: '美股科技', ret: 11.0, fee: 0.20 },
    'QQQM': { name: 'Invesco 納斯達克100 (低價)', type: '美股科技', ret: 11.0, fee: 0.15 },
    'VUG': { name: 'Vanguard 美股成長', type: '美股成長', ret: 10.5, fee: 0.04 },
    
    // 美股高股息/價值
    'SCHD': { name: 'Schwab 股息權益', type: '美股高息', ret: 8.5, fee: 0.06 },
    'VYM': { name: 'Vanguard 高股息', type: '美股高息', ret: 8.0, fee: 0.06 },

    // 全球大盤
    'VT': { name: 'Vanguard 全球總市場', type: '全球大盤', ret: 8.0, fee: 0.07 },
    'VWRA': { name: 'Vanguard 英國上市全球', type: '全球大盤 (英股)', ret: 8.0, fee: 0.22 },
    'URTH': { name: 'iShares MSCI全球', type: '全球大盤', ret: 8.0, fee: 0.24 },

    // 台灣發行的海外 ETF
    '00646': { name: '元大S&P500', type: '台灣發行美股', ret: 9.0, fee: 0.45 },
    '00662': { name: '富邦NASDAQ', type: '台灣發行美股', ret: 10.5, fee: 0.55 },
    '00830': { name: '國泰費城半導體', type: '台灣發行美股', ret: 12.0, fee: 0.50 },
    '00757': { name: '統一FANG+', type: '台灣發行美股', ret: 12.0, fee: 0.55 },
    
    // 債券 (海外)
    'BND': { name: 'Vanguard 總體債券', type: '美國公債+投資級', ret: 4.0, fee: 0.03 },
    'BNDW': { name: 'Vanguard 全球總體債券', type: '全球債券', ret: 3.5, fee: 0.05 },
    'TLT': { name: 'iShares 20年期以上美債', type: '美國長債', ret: 4.5, fee: 0.15 },
    'IEF': { name: 'iShares 7-10年期美債', type: '美國中債', ret: 4.0, fee: 0.15 },
    'SHY': { name: 'iShares 1-3年期美債', type: '美國短債', ret: 3.5, fee: 0.15 },

    // 債券 (台灣發行)
    '00679B': { name: '元大美債20年', type: '台灣發行美債', ret: 4.5, fee: 0.20 },
    '00687B': { name: '國泰20年美債', type: '台灣發行美債', ret: 4.5, fee: 0.20 },
    '00720B': { name: '元大投資級公司債', type: '投資級企業債', ret: 5.0, fee: 0.25 },
    '00751B': { name: '元大AAA至A公司債', type: '投資級企業債', ret: 4.8, fee: 0.25 },
    '00719B': { name: '元大美債1-3', type: '美國短債', ret: 3.5, fee: 0.20 }
  };

  function initEtfSearch() {
    const input = $('etfSearchInput');
    if (!input) return;
    input.addEventListener('input', () => {
      const val = input.value.toUpperCase().trim();
      const badge = $('etfBadge');
      if (val === '') {
        badge.style.display = 'none';
        return;
      }
      
      if (etfDB[val]) {
        const etf = etfDB[val];
        badge.style.display = 'flex';
        badge.style.color = 'var(--system-green-dark)';
        badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 已帶入：${etf.name} (${etf.type})`;
        
        $('expectedReturn').value = etf.ret.toFixed(2);
        $('fee').value = etf.fee.toFixed(2);
        
        // 閃爍綠色動畫提示
        $('expectedReturn').style.transition = 'background-color 0.3s';
        $('fee').style.transition = 'background-color 0.3s';
        $('expectedReturn').style.backgroundColor = '#E5F6E6';
        $('fee').style.backgroundColor = '#E5F6E6';
        setTimeout(() => {
          $('expectedReturn').style.backgroundColor = '';
          $('fee').style.backgroundColor = '';
        }, 600);
        
        calculate(false);
      } else {
        badge.style.display = 'flex';
        badge.style.color = 'var(--label-secondary)';
        badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> 未收錄該代號，請於下方手動輸入`;
      }
    });
  }

  // ──"""

old_setPortfolio = """    if ($('portfolioDesc')) {
      $('portfolioDesc').innerHTML = desc;
      $('portfolioDesc').style.borderLeftColor = isCustom ? 'var(--text-secondary)' : 'var(--accent)';
    }

    if (!isCustom) {
      $('expectedReturn').value = ret;
      $('fee').value = fee;
    }
    
    saveLocalState();"""

new_setPortfolio = """    if ($('portfolioDesc')) {
      $('portfolioDesc').innerHTML = desc;
      $('portfolioDesc').style.borderLeftColor = isCustom ? 'var(--text-secondary)' : 'var(--accent)';
    }
    
    if ($('boxEtfSearch')) {
      $('boxEtfSearch').style.display = isCustom ? 'block' : 'none';
      if (isCustom && $('etfSearchInput').value === '') {
        setTimeout(() => $('etfSearchInput').focus(), 100);
      }
    }

    if (!isCustom) {
      $('expectedReturn').value = ret;
      $('fee').value = fee;
    }
    
    saveLocalState();"""


for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject HTML search box
    target_html_old = """            <!-- 選中配方的細節說明 -->
            <div class="pension-desc-note" id="portfolioDesc" style="margin-top:0; font-size:13px; background:#F9F9FB; border-left-color:var(--text-secondary);">
              <strong>台美大盤旗艦型：</strong>80% 台灣 0050/006208 搭配 20% 美股 VOO。兼顧台股免稅優勢與美股全球影響力。（預期年化 8.0%，內扣 0.20%）
            </div>"""
    content = content.replace(target_html_old, html_search_box)
    
    # 2. Inject JS database
    content = content.replace('// 支援 URL 參數一鍵載入（供 Blog 專欄一鍵連動試算）', js_smart_db + '\n  // 支援 URL 參數一鍵載入（供 Blog 專欄一鍵連動試算）')
    
    # 3. Inject initEtfSearch call in init sequence
    target_init_old = """  // 若 URL 帶有特定試算參數（來自專欄），覆蓋並即時試算
  loadFromUrlParams();"""
    target_init_new = """  initEtfSearch();\n  // 若 URL 帶有特定試算參數（來自專欄），覆蓋並即時試算\n  loadFromUrlParams();"""
    content = content.replace(target_init_old, target_init_new)
    
    # 4. Modify setPortfolio to toggle search box visibility
    content = content.replace(old_setPortfolio, new_setPortfolio)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Smart ETF DB Added!")
