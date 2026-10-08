import type { Strings } from "./zh-TW";

export const en: Strings = {
  app: {
    brandTitle: "0050 Life",
    brandSubtitle: "Retirement Planner",
    brandHomeLabel: "0050 Life home",
    blog: "Retirement Notes",
    reset: "Start over",
    print: "Print results",
    navLabel: "Calculators",
    navRetirement: "Retirement",
    navInvestment: "Investing",
    navIncome: "Retirement Income",
    navCashflow: "Cash Flow",
    mobileTabsLabel: "Planner pages",
    mobileTabInputs: "Your inputs",
    mobileTabResults: "Results",
    languageLabel: "Language"
  },
  steps: {
    label: "Steps",
    names: ["Timeline", "Labor Insurance", "National Pension", "Labor Pension", "Investments"],
    titles: ["Retirement timeline", "Labor insurance", "National pension", "Labor pension", "Investments"],
    stepWord: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    prev: "Back",
    next: "Next",
    viewResults: "See results",
    viewResultsFull: "View results",
    nextPrefix: "Next: "
  },
  pensionSetup: {
    label: "Pension coverage",
    hint: "Quick presets set everything at once; you can also toggle each. Only enable what you actually have",
    taiwanPreset: "Taiwan",
    otherPreset: "Other country",
    labor: "Labor Insurance",
    laborDesc: "Worked in Taiwan with labor insurance years",
    national: "National Pension",
    nationalDesc: "Paid national pension in Taiwan",
    pension: "Labor Pension",
    pensionDesc: "Employer contributed to labor pension account",
    currencyLabel: "Currency",
    calendarLabel: "Birth year calendar",
    calendarROC: "ROC",
    calendarCE: "CE",
    birthYearROC: "Birth year (ROC)",
    birthYearCE: "Birth year"
  },
  common: {
    back: "Back",
    confirm: "OK",
    cancel: "Cancel",
    units: {
      year: "yrs",
      month: "mo",
      age: "yrs old",
      money: "",
      percent: "%"
    },
    stepDown: (label: string) => `Decrease ${label}`,
    stepUp: (label: string) => `Increase ${label}`
  },
  inputProfile: {
    why: "Decide when to retire and how much you'll spend each month — everything else flows from these two.",
    birthMonth: "Birth month",
    retirementAge: "Retire at age",
    longevityAge: "Plan through age",
    longevityHint: "The planner runs through this age — 90 or above is a safe choice.",
    monthlySpending: "Monthly living expenses after retirement",
    monthlySpendingHint: "Excluding rent, in today's prices",
    rentMonthly: "Monthly rent",
    rentMonthlyHint: "Only if you rent — enter 0 otherwise",
    rentInflation: "Annual rent increase",
    rentInflationHint: "Long-run average is about 2%; calculated separately from living expenses",
    moreAssumptions: "More living assumptions",
    inflation: "Annual inflation",
    medicalSection: "Healthcare & long-term care (optional)",
    medicalMonthly: "Monthly medical budget",
    medicalMonthlyHint: "Chronic conditions, visits, and out-of-pocket costs — 0 is fine to start",
    medicalInflation: "Annual medical cost growth",
    longTermCareEnabled: "Set aside a long-term care budget",
    longTermCareStartAge: "Start reserving from age",
    longTermCareMonthly: "Monthly long-term care budget",
    longTermCareMonthlyHint: "In today's prices",
    partTimeEnabled: "Part-time income after retirement",
    partTimeMonthly: "Monthly part-time income",
    partTimeMonthlyHint: "In today's prices",
    partTimeStartAge: "Part-time starts at age",
    partTimeEndAge: "Part-time ends at age",
    partTimeGrowth: "Annual income growth"
  },
  empty: {
    needInputsTitle: "Finish your inputs first",
    needInputsBody: "Fields that need attention are marked in the input panel.",
    calcFailedTitle: "Calculation did not finish"
  },
  chart: {
    title: "Retirement investment balance over time",
    ageLabel: (age: number) => `age ${age.toFixed(0)}`,
    desc: (minAgeLabel: string, minAssets: string, maxAgeLabel: string, maxAssets: string) =>
      `From ${minAssets} at ${minAgeLabel}, to ${maxAssets} at ${maxAgeLabel}.`,
    pointTip: (ageLabel: string, assets: string) => `${ageLabel}: ${assets}`
  },
  cashflow: {
    eyebrow: "0050 Life · Retirement Cash Flow",
    title: "Can your retirement assets last?",
    intro: "This page doesn't recalculate pensions or investment growth — it stress-tests your monthly withdrawals against the assets you bring in.",
    assetsLabel: "Assets at retirement (nominal at that time)",
    withdrawalLabel: "Monthly spending from assets (today's prices)",
    assetsNote: (assets: string) => `Pre-filled with about ${assets} from the retirement page; changes here don't affect your retirement plan.`,
    answerPrefix: (age: number) => `Through age ${age}, projected balance`,
    depleted: (age: number) => `Runs short around age ${age.toFixed(0)}`,
    notDepleted: "Under these simplified withdrawal assumptions, assets last through the planning period",
    yearlyTitle: "Year-by-year balance (today's prices)",
    colAge: "Age",
    colBalance: "Balance",
    ageLabel: (age: number) => `age ${age.toFixed(0)}`,
    footnote: "This is a standalone withdrawal test — it ignores income relay, taxes, long-term care, and market volatility. Don't read it as a complete retirement plan."
  }
};
