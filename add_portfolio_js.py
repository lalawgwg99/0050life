import re

files = [
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html',
    '/Users/jazzxx/Desktop/德人參/index.html'
]

css_new = """
    .portfolio-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .port-chip {
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 100px;
      padding: 8px 14px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .port-chip:hover {
      border-color: var(--accent);
      background: rgba(0, 194, 199, 0.04);
    }
    .port-chip.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #FFFFFF;
      font-weight: 600;
    }
    .port-chip.active .chip-icon {
      opacity: 1;
    }
    /* ...existing... */"""

js_old = """  function applyPortfolioPreset() {
    const p = $('portfolioPreset').value;
    if (p === 'custom') return;

    let ret = 8.0, fee = 0.20;
    if (p === 'tw_us_flagship') { ret = 8.0; fee = 0.20; }
    else if (p === 'world_passive') { ret = 7.5; fee = 0.22; }
    else if (p === 'us_sp500') { ret = 9.0; fee = 0.08; }
    else if (p === 'high_div') { ret = 6.0; fee = 0.60; }
    else if (p === 'defensive') { ret = 5.5; fee = 0.15; }

    $('expectedReturn').value = ret;
    $('fee').value = fee;
    calculate(false);
  }

  function onCustomReturnInput() {
    $('portfolioPreset').value = 'custom';
    calculate(false);
  }"""

js_new = """  function setPortfolio(preset, btnElem) {
    if (btnElem) {
      document.querySelectorAll('.port-chip').forEach(el => el.classList.remove('active'));
      btnElem.classList.add('active');
    }
    $('portfolioPreset').value = preset;
    
    let ret = 8.0, fee = 0.20, desc = '';
    let isCustom = false;
    
    if (preset === 'tw_us_flagship') { 
      ret = 8.0; fee = 0.20; 
      desc = '<strong>⚖️ 台美大盤旗艦型：</strong>80% 台灣 0050 等大盤 + 20% 美股 VOO。兼顧台股免稅優勢與美股全球科技影響力。（預估年化 8.0%，內扣 0.20%）';
    } else if (preset === 'us_sp500') { 
      ret = 9.5; fee = 0.08; 
      desc = '<strong>🇺🇸 純美股標普 500：</strong>100% 投資美股 VOO/SPY。享受全球最強經濟體與百大企業成長，內扣極低。（預估年化 9.5%，內扣 0.08%）';
    } else if (preset === 'tw_0050') { 
      ret = 8.5; fee = 0.35; 
      desc = '<strong>🇹🇼 純台股大盤：</strong>100% 投資台灣 0050/006208。最熟悉的本土市場，享有零海外所得稅的絕對優勢。（預估年化 8.5%，內扣 0.35%）';
    } else if (preset === 'world_passive') { 
      ret = 7.5; fee = 0.22; 
      desc = '<strong>🌍 全球全市場被動型：</strong>100% 投資 VT/VWRA。一檔買下全世界 9000 家公司，完全分散單一國家風險。（預估年化 7.5%，內扣 0.22%）';
    } else if (preset === 'balance_8020') { 
      ret = 7.0; fee = 0.15; 
      desc = '<strong>🛡️ 股債平衡 (80/20)：</strong>80% 全球大盤 + 20% 美國公債 (BND/TLT)。犧牲一點報酬換取更穩定的資產波動，適合退休前 5 年配置。（預估年化 7.0%，內扣 0.15%）';
    } else if (preset === 'custom') {
      isCustom = true;
      desc = '<strong>⚙️ 完全自訂：</strong>請在下方手動輸入您預期的「年化報酬率」與「內扣費用」。如果您有自己獨門的選股策略或不動產收租配置，可在此微調。';
    }

    if ($('portfolioDesc')) {
      $('portfolioDesc').innerHTML = desc;
      $('portfolioDesc').style.borderLeftColor = isCustom ? 'var(--text-secondary)' : 'var(--accent)';
    }

    if (!isCustom) {
      $('expectedReturn').value = ret;
      $('fee').value = fee;
    }
    
    saveLocalState();
    calculate(false);
  }

  function applyPortfolioPreset() {
    setPortfolio($('portfolioPreset').value);
  }

  function onCustomReturnInput() {
    setPortfolio('custom');
    
    // Select the custom chip visually
    document.querySelectorAll('.port-chip').forEach(el => el.classList.remove('active'));
    const customChip = Array.from(document.querySelectorAll('.port-chip')).find(el => el.textContent.includes('自訂'));
    if (customChip) customChip.classList.add('active');
  }"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # inject CSS before </style>
    if '.port-chip {' not in content:
        content = content.replace('</style>', css_new + '\n</style>')
        
    content = content.replace(js_old, js_new)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Pillar 3 JS and CSS added!")
