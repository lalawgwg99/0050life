export const zhTW = {
  app: {
    brandTitle: "0050 Life",
    brandSubtitle: "退休規劃試算",
    brandHomeLabel: "0050 Life 首頁",
    blog: "退休筆記",
    reset: "重新填寫",
    print: "列印結果",
    navLabel: "試算工具",
    navRetirement: "退休規劃",
    navInvestment: "投資成長",
    navIncome: "退休收入",
    navCashflow: "退休現金流",
    mobileTabsLabel: "試算頁面",
    mobileTabInputs: "填寫資料",
    mobileTabResults: "試算結果",
    languageLabel: "語言"
  },
  steps: {
    label: "填寫步驟",
    names: ["退休時間", "勞保", "國民年金", "勞退", "投資"] as string[],
    titles: ["你的退休時間", "勞保老年給付", "國民年金", "勞退個人專戶", "自己的投資"] as string[],
    stepWord: ["第一步", "第二步", "第三步", "第四步", "第五步"] as string[],
    prev: "上一步",
    next: "下一步",
    viewResults: "看結果",
    viewResultsFull: "查看試算結果",
    nextPrefix: "下一步："
  },
  pensionSetup: {
    label: "適用年金制度",
    hint: "快捷鍵一次設好，也可以單獨開關；在台灣工作過、有年資才需要打開",
    taiwanPreset: "台灣",
    otherPreset: "其他國家",
    labor: "勞工保險",
    laborDesc: "曾在台灣工作、有勞保年資",
    national: "國民年金",
    nationalDesc: "曾在台灣繳過國保",
    pension: "勞退新制",
    pensionDesc: "雇主有提繳勞退專戶",
    currencyLabel: "幣別",
    calendarLabel: "出生年曆法",
    calendarROC: "民國",
    calendarCE: "西元",
    birthYearROC: "民國出生年",
    birthYearCE: "出生年份（西元）"
  },
  common: {
    back: "返回",
    confirm: "確定",
    cancel: "取消",
    units: {
      year: "年",
      month: "月",
      age: "歲",
      money: "元",
      percent: "%"
    },
    stepDown: (label: string) => `減少${label}`,
    stepUp: (label: string) => `增加${label}`
  },
  inputProfile: {
    why: "先決定什麼時候退休、每個月要花多少，後面才能算出錢夠不夠用。",
    birthMonth: "出生月份",
    retirementAge: "想幾歲退休",
    longevityAge: "希望規劃到",
    longevityHint: "試算會一路算到這個年齡，建議填 90 歲以上",
    monthlySpending: "退休後每月生活費",
    monthlySpendingHint: "不含房租，請填今天物價下需要的金額",
    rentMonthly: "每月房租",
    rentMonthlyHint: "有租屋再填，沒有就填 0",
    rentInflation: "房租每年上漲",
    rentInflationHint: "長期平均約 2%，會跟生活費分開計算",
    moreAssumptions: "更多生活假設",
    inflation: "每年物價上漲（通膨）",
    medicalSection: "醫療與長照（選填）",
    medicalMonthly: "每月醫療預算",
    medicalMonthlyHint: "慢性病、看診與自費項目，可先填 0",
    medicalInflation: "醫療費每年增加",
    longTermCareEnabled: "預留長照費用",
    longTermCareStartAge: "從幾歲開始預留",
    longTermCareMonthly: "每月長照預算",
    longTermCareMonthlyHint: "請填今天物價下的金額",
    partTimeEnabled: "退休後有兼職收入",
    partTimeMonthly: "每月兼職收入",
    partTimeMonthlyHint: "請填今天物價下的金額",
    partTimeStartAge: "兼職開始年齡",
    partTimeEndAge: "兼職結束年齡",
    partTimeGrowth: "收入每年增加"
  },
  empty: {
    needInputsTitle: "先完成左側資料",
    needInputsBody: "需要調整的地方會直接標示在輸入區。",
    calcFailedTitle: "這次沒有算完"
  },
  chart: {
    title: "退休後投資資產變化",
    ageLabel: (age: number) => `${age.toFixed(0)} 歲`,
    desc: (minAgeLabel: string, minAssets: string, maxAgeLabel: string, maxAssets: string) =>
      `從 ${minAgeLabel} 的 ${minAssets}，到 ${maxAgeLabel} 的 ${maxAssets}。`,
    pointTip: (ageLabel: string, assets: string) => `${ageLabel}：${assets}`
  },
  cashflow: {
    eyebrow: "0050 Life・退休現金流",
    title: "只看退休後資產夠不夠用",
    intro: "這一頁不重新計算勞保或投資累積，只把你提供的退休資產拿來測試每月提領。",
    assetsLabel: "退休時可用資產（當年帳面）",
    withdrawalLabel: "每月由資產支付（今天物價）",
    assetsNote: (assets: string) => `目前退休頁帶入的資產約 ${assets}；這裡修改不會改變退休規劃。`,
    answerPrefix: (age: number) => `規劃到 ${age} 歲後，預計剩下`,
    depleted: (age: number) => `約 ${age.toFixed(0)} 歲開始不足`,
    notDepleted: "依目前簡化提領假設，規劃期間內尚未用完",
    yearlyTitle: "逐年資產（今天物價）",
    colAge: "年齡",
    colBalance: "資產餘額",
    ageLabel: (age: number) => `${age.toFixed(0)} 歲`,
    footnote: "這是獨立提領試算，未加入收入接力、稅額、長照與市場波動；不要把本頁結果直接解讀成完整退休計畫。"
  }
};

export type Strings = typeof zhTW;
