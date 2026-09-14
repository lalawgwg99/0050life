import re

files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

old_block = """  // 常用投資組合模板定義
  const portfolioTemplates = {
    tw_us_flagship: { ret: 8.0, fee: 0.20 },
    world_passive: { ret: 7.5, fee: 0.22 },
    us_sp500: { ret: 9.0, fee: 0.08 },
    dividend_income: { ret: 6.0, fee: 0.45 },
    balanced_6040: { ret: 5.5, fee: 0.30 }
  };

  function applyPortfolioPreset() {
    const val = $('portfolioPreset').value;
    if (portfolioTemplates[val]) {
      $('expectedReturn').value = portfolioTemplates[val].ret;
      $('fee').value = portfolioTemplates[val].fee;
    }
    updateNetReturnTag();
    calculate(false);
  }

  function onCustomReturnInput() {
    if ($('portfolioPreset')) $('portfolioPreset').value = 'custom';
    updateNetReturnTag();
    calculate(false);
  }

  function updateNetReturnTag() {
    const net = (n('expectedReturn') - n('fee')).toFixed(2);
    if ($('tagNetReturn')) $('tagNetReturn').textContent = `實質淨年化 ${net}%`;
  }"""

new_block = """  // ── 第三支柱：資產配置與配方選擇器 ──
  function setPortfolio(preset, btnElem) {
    if (btnElem) {
      document.querySelectorAll('.port-chip').forEach(el => el.classList.remove('active'));
      btnElem.classList.add('active');
    } else {
      document.querySelectorAll('.port-chip').forEach(el => {
        const onclick = el.getAttribute('onclick') || '';
        if (onclick.includes("'" + preset + "'")) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    }
    
    if ($('portfolioPreset')) $('portfolioPreset').value = preset;
    
    let ret = 8.0, fee = 0.20, desc = '';
    let isCustom = false;
    
    if (preset === 'tw_us_flagship') { 
      ret = 8.0; fee = 0.20; 
      desc = '<strong>⚖️ 台美大盤旗艦型：</strong>80% 台灣 0050/006208 搭配 20% 美股 VOO。兼顧台股免稅優勢與美股全球影響力。（預期年化 8.0%，內扣 0.20%）';
    } else if (preset === 'us_sp500') { 
      ret = 9.5; fee = 0.08; 
      desc = '<strong>🇺🇸 純美股標普 500：</strong>100% 投資美股 VOO/SPY。享受全球最強經濟體與百大企業成長，內扣極低。（預期年化 9.5%，內扣 0.08%）';
    } else if (preset === 'tw_0050') { 
      ret = 8.5; fee = 0.35; 
      desc = '<strong>🇹🇼 純台股大盤：</strong>100% 投資台灣 0050/006208。最熟悉的本土市場，享有零海外所得稅的絕對優勢。（預期年化 8.5%，內扣 0.35%）';
    } else if (preset === 'world_passive') { 
      ret = 7.5; fee = 0.22; 
      desc = '<strong>🌍 全球全市場被度型：</strong>100% 投資 VT/VWRA。一檔買下全世界 9000 家公司，完全分散單一國家風險。（預期年化 7.5%，內扣 0.22%）';
    } else if (preset === 'balance_8020') { 
      ret = 7.0; fee = 0.15; 
      desc = '<strong>🛡️ 股債平衡 (80/20)：</strong>80% 全球大盤 + 20% 美國公債 (BND/TLT)。犧牲一點報酬換取更穩定的資產波動，適合退休前 5 年配置。（預期年化 7.0%，內扣 0.15%）';
    } else if (preset === 'custom') {
      isCustom = true;
      desc = '<strong>⚙️ 完全自訂：</strong>請在下方手動輸入您預期的「年化報酬率」與「內扣費用」，或使用下方的「內建 ETF 智慧字典」直接輸入代號自動帶入數據。';
    }

    if ($('portfolioDesc')) {
      $('portfolioDesc').innerHTML = desc;
      $('portfolioDesc').style.borderLeftColor = isCustom ? 'var(--text-secondary)' : 'var(--accent)';
    }
    
    if ($('boxEtfSearch')) {
      $('boxEtfSearch').style.display = isCustom ? 'block' : 'none';
      if (isCustom && $('etfSearchInput')) {
        setTimeout(() => $('etfSearchInput').focus(), 100);
      }
    }

    if (!isCustom) {
      $('expectedReturn').value = ret.toFixed(1);
      $('fee').value = fee.toFixed(2);
    }
    
    updateNetReturnTag();
    saveLocalState();
    calculate(false);
  }

  function applyPortfolioPreset() {
    const preset = $('portfolioPreset') ? $('portfolioPreset').value : 'tw_us_flagship';
    setPortfolio(preset);
  }

  function onCustomReturnInput() {
    if ($('portfolioPreset')) $('portfolioPreset').value = 'custom';
    document.querySelectorAll('.port-chip').forEach(el => el.classList.remove('active'));
    const customChip = Array.from(document.querySelectorAll('.port-chip')).find(el => el.textContent.includes('自訂'));
    if (customChip) customChip.classList.add('active');
    
    if ($('boxEtfSearch')) $('boxEtfSearch').style.display = 'block';
    updateNetReturnTag();
    calculate(false);
  }

  function updateNetReturnTag() {
    const net = (n('expectedReturn') - n('fee')).toFixed(2);
    if ($('tagNetReturn')) $('tagNetReturn').textContent = `實質淨年化 ${net}%`;
  }"""

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if old_block in content:
        content = content.replace(old_block, new_block)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Replaced successfully in {filepath}")
    else:
        print(f"Warning: old_block not found in {filepath}")
