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
  region: {
    label: "你在哪裡退休？",
    hint: "台灣會計算勞保、國民年金與勞退；其他國家只規劃自己的投資與支出",
    taiwan: "台灣",
    other: "其他國家",
    currencyLabel: "幣別"
  },
  common: {
    back: "返回",
    confirm: "確定",
    cancel: "取消"
  },
  empty: {
    needInputsTitle: "先完成左側資料",
    needInputsBody: "需要調整的地方會直接標示在輸入區。",
    calcFailedTitle: "這次沒有算完"
  }
};

export type Strings = typeof zhTW;
