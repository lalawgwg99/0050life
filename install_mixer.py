import re

files = [
    '/Users/jazzxx/Desktop/德人參/index.html',
    '/Users/jazzxx/Desktop/德人參/retirement-simulator.html'
]

css_mixer = """
    /* 多資產混搭組合器 (Apple Inset List Style) */
    .mixer-container {
      margin-top: 12px;
      margin-bottom: 8px;
      padding: 16px;
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }
    .mixer-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .mixer-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mixer-rows-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mixer-row {
      display: grid;
      grid-template-columns: 110px 1fr 90px 32px;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      background: #F9FAFB;
      border: 1px solid rgba(0,0,0,0.04);
      border-radius: 10px;
      transition: background 0.15s;
    }
    .mixer-row:hover {
      background: #F3F4F6;
    }
    .mixer-input-code {
      height: 36px !important;
      font-size: 14px !important;
      text-transform: uppercase;
      font-weight: 700;
      padding: 0 10px !important;
    }
    .mixer-meta-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .mixer-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mixer-sub {
      font-size: 11px;
      color: var(--label-secondary);
      font-variant-numeric: tabular-nums;
    }
    .mixer-input-weight {
      height: 36px !important;
      font-size: 14px !important;
      padding: 0 24px 0 10px !important;
      text-align: right;
    }
    .btn-mixer-del {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--label-tertiary);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.15s;
    }
    .btn-mixer-del:hover {
      background: #FEE2E2;
      color: var(--system-red);
    }
    @media (max-width: 600px) {
      .mixer-row {
        grid-template-columns: 90px 1fr 80px 28px;
        gap: 6px;
        padding: 6px 8px;
      }
      .mixer-input-code, .mixer-input-weight {
        height: 34px !important;
        font-size: 13px !important;
      }
      .mixer-name {
        font-size: 11.5px;
      }
      .mixer-sub {
        font-size: 10px;
      }
    }
"""

html_mixer = """            <!-- 智能多標的 ETF 混搭組合器 (支援 2~5 檔自由配比) -->
            <div id="boxEtfSearch" class="mixer-container" style="display:none;">
              <div class="mixer-title-row">
                <div class="mixer-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <span>多標的自選混搭配置（支援 1～5 檔標的）</span>
                </div>
                <button type="button" class="btn-action-outline" onclick="rebalanceMixerWeights()" style="padding:4px 10px; font-size:11.5px; border-radius:100px; color:var(--label-secondary);">
                  等比例平衡
                </button>
              </div>

              <!-- 標的清單容器 -->
              <div class="mixer-rows-wrap" id="etfMixerRows"></div>

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <button type="button" class="btn-action-outline" id="btnAddMixerRow" onclick="addMixerRow()" style="padding:6px 14px; font-size:12.5px; border-radius:100px; display:inline-flex; align-items:center; gap:6px; color:var(--accent); border-color:var(--accent);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>新增標的 (最多 5 檔)</span>
                </button>
                <div style="font-size:11.5px; color:var(--label-tertiary);">支援 41 檔海內外主流 ETF</div>
              </div>

              <!-- 混搭加權結果匯總 -->
              <div style="margin-top:12px; padding:10px 14px; background:var(--card-subtle); border-radius:10px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; font-size:12px; gap:8px;">
                <div>
                  合計權重：<strong id="mixerTotalWeight" style="color:var(--system-green-dark); font-variant-numeric:tabular-nums;">100%</strong>
                  <span id="mixerWeightStatus" style="margin-left:4px; font-size:11px; color:var(--label-secondary);"></span>
                </div>
                <div>
                  加權預期年化：<strong id="mixerWeightedReturn" style="color:var(--accent); font-variant-numeric:tabular-nums;">8.50%</strong>
                  ｜ 加權費用：<strong id="mixerWeightedFee" style="color:var(--label-primary); font-variant-numeric:tabular-nums;">0.25%</strong>
                </div>
              </div>
            </div>"""

old_search_box_regex = r'<div id="boxEtfSearch".*?</div>\s*</div>\s*</div>'

# JS logic for Mixer
js_mixer = """
  // ── 多資產混搭投資組合器 (支援 2~5 檔標的自由配比) ──
  let mixerAssets = [
    { code: '0050', weight: 60 },
    { code: 'VOO', weight: 40 }
  ];

  function renderMixerUI() {
    const wrap = $('etfMixerRows');
    if (!wrap) return;
    
    wrap.innerHTML = mixerAssets.map((item, idx) => {
      const etf = etfDB[item.code.toUpperCase()] || { name: '自訂代號 / 未收錄', type: '自訂', ret: 7.5, fee: 0.25 };
      return `
        <div class="mixer-row" data-idx="${idx}">
          <div>
            <input type="text" class="apple-input mixer-input-code" value="${item.code}" placeholder="代號" oninput="onMixerCodeChange(${idx}, this.value)">
          </div>
          <div class="mixer-meta-wrap">
            <div class="mixer-name">${etf.name}</div>
            <div class="mixer-sub">${etf.ret.toFixed(1)}% 預期 ｜ ${etf.fee.toFixed(2)}% 內扣</div>
          </div>
          <div>
            <div class="input-wrapper">
              <input type="number" class="apple-input mixer-input-weight" value="${item.weight}" min="0" max="100" step="5" oninput="onMixerWeightChange(${idx}, this.value)">
              <span class="input-unit">%</span>
            </div>
          </div>
          <div>
            ${mixerAssets.length > 1 ? `<button type="button" class="btn-mixer-del" onclick="deleteMixerRow(${idx})" title="刪除此標的">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // 控制新增按鈕是否停用 (最多 5 檔)
    if ($('btnAddMixerRow')) {
      if (mixerAssets.length >= 5) {
        $('btnAddMixerRow').style.opacity = '0.4';
        $('btnAddMixerRow').style.pointerEvents = 'none';
      } else {
        $('btnAddMixerRow').style.opacity = '1';
        $('btnAddMixerRow').style.pointerEvents = 'auto';
      }
    }

    recalcMixer();
  }

  function onMixerCodeChange(idx, val) {
    mixerAssets[idx].code = val.toUpperCase().trim();
    renderMixerUI();
  }

  function onMixerWeightChange(idx, val) {
    mixerAssets[idx].weight = parseFloat(val) || 0;
    recalcMixer();
  }

  function addMixerRow() {
    if (mixerAssets.length >= 5) return;
    const candidates = ['0050', 'VOO', 'BND', '00878', 'QQQ', 'TLT', 'VT'];
    const currentCodes = mixerAssets.map(a => a.code);
    const nextCode = candidates.find(c => !currentCodes.includes(c)) || '0050';
    mixerAssets.push({ code: nextCode, weight: 0 });
    rebalanceMixerWeights();
  }

  function deleteMixerRow(idx) {
    if (mixerAssets.length <= 1) return;
    mixerAssets.splice(idx, 1);
    rebalanceMixerWeights();
  }

  function rebalanceMixerWeights() {
    if (mixerAssets.length === 0) return;
    const equalWeight = Math.floor(100 / mixerAssets.length);
    const remainder = 100 - (equalWeight * mixerAssets.length);
    mixerAssets.forEach((item, idx) => {
      item.weight = equalWeight + (idx === 0 ? remainder : 0);
    });
    renderMixerUI();
  }

  function recalcMixer() {
    let totalWeight = 0;
    let weightedRetSum = 0;
    let weightedFeeSum = 0;

    mixerAssets.forEach(item => {
      const etf = etfDB[item.code.toUpperCase()] || { ret: 7.5, fee: 0.25 };
      totalWeight += item.weight;
      weightedRetSum += etf.ret * item.weight;
      weightedFeeSum += etf.fee * item.weight;
    });

    const isHundred = Math.abs(totalWeight - 100) < 0.1;
    const weightEl = $('mixerTotalWeight');
    const statusEl = $('mixerWeightStatus');

    if (weightEl) {
      weightEl.textContent = totalWeight + '%';
      weightEl.style.color = isHundred ? 'var(--system-green-dark)' : (totalWeight > 100 ? 'var(--system-red)' : '#B45309');
    }
    if (statusEl) {
      statusEl.textContent = isHundred ? '（權重完整 100%）' : (totalWeight > 100 ? '⚠️ 超過 100%（自動折算）' : '⚠️ 未滿 100%（自動折算）');
    }

    if (totalWeight > 0) {
      const blendedRet = (weightedRetSum / totalWeight);
      const blendedFee = (weightedFeeSum / totalWeight);

      if ($('mixerWeightedReturn')) $('mixerWeightedReturn').textContent = blendedRet.toFixed(2) + '%';
      if ($('mixerWeightedFee')) $('mixerWeightedFee').textContent = blendedFee.toFixed(2) + '%';

      if ($('expectedReturn')) $('expectedReturn').value = blendedRet.toFixed(2);
      if ($('fee')) $('fee').value = blendedFee.toFixed(2);
      
      updateNetReturnTag();
      saveLocalState();
      calculate(false);
    }
  }
"""

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject CSS before </style>
    if '.mixer-container' not in content:
        content = content.replace('</style>', css_mixer + '\n</style>')

    # 2. Replace the old single-input search box with the Multi-Asset Mixer
    search_target = '<div id="boxEtfSearch" style="display:none;'
    # Find start of boxEtfSearch and replace through its closing tag
    if search_target in content:
        start_idx = content.find(search_target)
        # Find closing tag of this div
        end_str = '</div>\n          </div>\n\n          <!-- 現有投資部位 -->'
        if end_str in content:
            end_idx = content.find(end_str)
            content = content[:start_idx] + html_mixer + '\n          </div>\n\n          <!-- 現有投資部位 -->' + content[end_idx + len(end_str):]
        else:
            print("Warning: end_str not found in", fpath)

    # 3. Add JS logic
    if 'let mixerAssets =' not in content:
        content = content.replace('// ── 智能 ETF 資料庫', js_mixer + '\n  // ── 智能 ETF 資料庫')

    # 4. In setPortfolio, call renderMixerUI if custom
    content = content.replace(
        "if ($('boxEtfSearch')) {\n      $('boxEtfSearch').style.display = isCustom ? 'block' : 'none';",
        "if ($('boxEtfSearch')) {\n      $('boxEtfSearch').style.display = isCustom ? 'block' : 'none';\n      if (isCustom) renderMixerUI();"
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Installed Multi-Asset Mixer successfully!")
