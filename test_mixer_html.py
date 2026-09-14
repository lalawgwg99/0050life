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
print("CSS draft ready")
