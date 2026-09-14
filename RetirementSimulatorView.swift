import SwiftUI

enum WithdrawalMode: String, CaseIterable, Identifiable {
    case perpetual = "4% 安全提領"
    case deplete = "平滑享老 (花光)"
    var id: String { rawValue }
}

struct RetirementSimulatorView: View {
    // MARK: - Generic Default Data (新使用者預設值)
    @State private var currentAge: Double = 35.0
    @State private var retireAge: Int = 65
    @State private var targetToday: Int = 40000
    @State private var inflation: Double = 2.0
    @State private var partTime: Int = 0
    @State private var withdrawRate: Double = 4.0
    
    // 提領哲學與壽命規劃 (年金精算模型)
    @State private var withdrawalMode: WithdrawalMode = .perpetual
    @State private var lifeExpectancy: Double = 85.0
    
    // 勞保
    @State private var claimAge: Int = 65
    @State private var laborYearsNow: Double = 10.0
    @State private var futureLaborYears: Double = 30.0
    @State private var avgInsuredSalary: Int = 45800
    
    // 勞退
    @State private var pensionBalance: Int = 300_000
    @State private var pensionWage: Int = 45800
    @State private var selfRate: Int = 6
    @State private var pensionReturn: Double = 3.0
    @State private var isPensionLumpSum: Bool = true
    
    // 自有資產
    @State private var assetsNow: Int = 500_000
    @State private var monthlyInvest: Int = 10_000
    @State private var expectedReturn: Double = 8.0
    @State private var fee: Double = 0.3
    
    // MARK: - Computed Properties (計算邏輯)
    
    private var yearsToRetire: Double {
        max(0, Double(retireAge) - currentAge)
    }
    
    private var inflationFactor: Double {
        let inflationRate = inflation / 100.0
        return pow(1.0 + inflationRate, yearsToRetire)
    }
    
    private var targetNominal: Double {
        RetirementCalculation.inflatedValue(
            todayValue: Double(targetToday),
            inflation: inflation / 100.0,
            years: yearsToRetire
        )
    }
    
    private var partTimeNominal: Double {
        Double(partTime) * inflationFactor
    }
    
    
    private var statutoryAge: Int { 65 }
    
    private var laborFullMonthly: Double {
        let totalYears = laborYearsNow + futureLaborYears
        let base = max(Double(avgInsuredSalary) * totalYears * 0.00775 + 3000, Double(avgInsuredSalary) * totalYears * 0.0155)
        let diff = max(-5.0, min(5.0, Double(claimAge - statutoryAge)))
        return base * (1 + diff * 0.04)
    }
    
    private var projectedStockAssets: Double {
        let months = Int(yearsToRetire * 12)
        let grossReturn = expectedReturn / 100.0
        let annualFee = fee / 100.0
        let netReturn = RetirementCalculation.netAnnualReturn(grossReturn: grossReturn, annualFee: annualFee)
        
        return RetirementCalculation.futureValue(
            pv: Double(assetsNow),
            pmt: Double(monthlyInvest),
            annualRate: netReturn,
            months: months,
            contributionAtBeginning: false
        )
    }
    
    private var projectedPensionLump: Double {
        let months = Int(yearsToRetire * 12)
        let pensionMonthlyPmt = Double(pensionWage) * (0.06 + Double(selfRate) / 100.0)
        return RetirementCalculation.futureValue(
            pv: Double(pensionBalance),
            pmt: pensionMonthlyPmt,
            annualRate: pensionReturn / 100.0,
            months: months,
            contributionAtBeginning: false
        )
    }
    
    private var projectedPensionMonthly: Double {
        if isPensionLumpSum { return 0 }
        let pensionFactor = retireAge >= 65 ? 207.24 : 242.88
        return projectedPensionLump / pensionFactor
    }
    
    private var laborAtRetire: Double {
        claimAge <= retireAge ? laborFullMonthly : 0
    }
    
    private var netStockEquity: Double {
        projectedStockAssets + (isPensionLumpSum ? projectedPensionLump : 0)
    }
    
    private var monthlySWRIncome: Double {
        let wr = withdrawRate / 100.0
        return (netStockEquity * wr) / 12.0
    }
    
    private var netMonthlyNeedFromEquity: Double {
        max(0, targetNominal - laborAtRetire - projectedPensionMonthly - partTimeNominal)
    }
    
    private var netAnnualReturn: Double {
        RetirementCalculation.netAnnualReturn(
            grossReturn: expectedReturn / 100.0,
            annualFee: fee / 100.0
        )
    }
    
    private var realReturnRate: Double {
        RetirementCalculation.realReturn(
            nominalReturn: netAnnualReturn,
            inflation: inflation / 100.0
        )
    }
    
    // 所需本金 (雙模式切換：4% 安全提領 vs 平滑享老 PV 模型)
    private var requiredAssets: Double {
        let monthlyNeed = netMonthlyNeedFromEquity
        guard monthlyNeed > 0 else { return 0 }
        
        switch withdrawalMode {
        case .deplete:
            let years = max(1.0, lifeExpectancy - Double(retireAge))
            let months = Int(years * 12.0)
            return RetirementCalculation.presentValueOfAnnuity(
                payment: monthlyNeed,
                annualRate: realReturnRate,
                months: months
            )
        case .perpetual:
            return RetirementCalculation.requiredAssetsByWithdrawalRate(
                monthlyNeed: monthlyNeed,
                withdrawalRate: withdrawRate / 100.0
            )
        }
    } else {
                return netMonthlyNeedFromEquity * totalMonths
            }
        } else {
            let wr = withdrawRate / 100.0
            return wr > 0 ? (netMonthlyNeedFromEquity * 12.0 / wr) : 0
        }
    }
    
    // 精算 NPER 反推資產支援壽命
    private var longevityAssessment: (age: Int, sustainableYears: Double, isPerpetual: Bool) {
        let monthlyNeed = netMonthlyNeedFromEquity
        let assets = netStockEquity
        
        if monthlyNeed <= 0 {
            return (age: 100, sustainableYears: 999.0, isPerpetual: true)
        }
        if assets <= 0 {
            return (age: retireAge, sustainableYears: 0.0, isPerpetual: false)
        }
        
        let annualRealReturn = realReturnRate
        let monthlyRate = RetirementCalculation.monthlyRate(annualRealReturn)
        
        if monthlyRate > 0 && assets * monthlyRate >= monthlyNeed {
            return (age: 100, sustainableYears: 999.0, isPerpetual: true)
        }
        
        let months = RetirementCalculation.depletionMonths(
            assets: assets,
            monthlyWithdrawal: monthlyNeed,
            annualRealReturn: annualRealReturn
        )
        
        if months.isInfinite {
            return (age: 100, sustainableYears: 999.0, isPerpetual: true)
        }
        
        let years = months / 12.0
        let depletionAge = min(100, Int(round(Double(retireAge) + years)))
        
        return (age: depletionAge, sustainableYears: years, isPerpetual: false)
    }
        if netStockEquity <= 0 {
            return (retireAge, 0.0, false)
        }
        let rm = realReturnRate / 12.0
        let monthlyYield = netStockEquity * rm
        if monthlyYield >= netMonthlyNeedFromEquity {
            return (100, 999.0, true)
        }
        let ratio = (netStockEquity * rm) / netMonthlyNeedFromEquity
        var years: Double = 0
        if ratio < 1.0 && rm > 1e-5 {
            let nperMonths = -log(1.0 - ratio) / log(1.0 + rm)
            years = nperMonths / 12.0
        } else {
            years = (netStockEquity / netMonthlyNeedFromEquity) / 12.0
        }
        let depleteAge = min(100, Int(round(Double(retireAge) + years)))
        return (depleteAge, years, false)
    }
    
    private var shortfall: Double {
        max(0, requiredAssets - netStockEquity)
    }
    
    private var readiness: Double {
        requiredAssets > 0 ? min(1.0, netStockEquity / requiredAssets) : 1.0
    }
    
    private var totalAvailableAssets: Double {
        netStockEquity
    }
    
    private var currentTotalAssets: Double {
        Double(assetsNow + pensionBalance)
    }
    
    @State private var showingHelpSheet = false
    @State private var helpTopic = ""

    // MARK: - UI Body
    var body: some View {
        NavigationStack {
            Form {
                // 頂部儀表板 (現在 -> 未來 -> 結果)
                Section {
                    VStack(spacing: 16) {
                        // 缺口 Hero
                        VStack(spacing: 8) {
                            Text(withdrawalMode == .perpetual ? "退休資金缺口 (4% 安全提領)" : "退休資金缺口 (平滑享老)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                            
                            Text(shortfall, format: .currency(code: "TWD").precision(.fractionLength(0)))
                                .font(.system(size: 38, weight: .bold, design: .rounded))
                                .foregroundStyle(shortfall > 0 ? .red : .green)
                            
                            if shortfall <= 0 {
                                Label("目標已達成", systemImage: "checkmark.seal.fill")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.green)
                            } else {
                                Text("折合今日購買力約 \(Int(shortfall / inflationFactor)) 元")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                        
                        // 現在、未來、目標 (Triad)
                        HStack(spacing: 12) {
                            MetricCell(title: "【現在】已備", value: currentTotalAssets)
                            MetricCell(title: "【未來】累積", value: totalAvailableAssets)
                            MetricCell(title: "【結果】目標", value: requiredAssets)
                        }
                        
                        // 進度條
                        VStack(spacing: 6) {
                            ProgressView(value: readiness)
                                .tint(readiness >= 1.0 ? .green : (readiness > 0.7 ? .orange : .red))
                            
                            HStack {
                                Text("0%")
                                Spacer()
                                Text(readiness, format: .percent.precision(.fractionLength(0)))
                                    .fontWeight(.bold)
                                Spacer()
                                Text("100%")
                            }
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        }
                        
                        // 資產支援壽命卡片
                        HStack(alignment: .center) {
                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 5) {
                                    Image(systemName: "hourglass")
                                        .font(.caption2)
                                        .foregroundStyle(.blue)
                                    Text("現有資產支援壽命")
                                        .font(.caption2)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(.secondary)
                                }
                                if longevityAssessment.isPerpetual {
                                    Text("永續無虞（99+ 歲）")
                                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                                        .foregroundStyle(.green)
                                } else {
                                    Text("至 \(longevityAssessment.age) 歲 (支撐 \(String(format: "%.1f", longevityAssessment.sustainableYears)) 年)")
                                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                                        .foregroundStyle(longevityAssessment.age >= 80 ? .blue : .orange)
                                }
                            }
                            Spacer()
                            Text(longevityAssessment.isPerpetual ? "永續留本" : (longevityAssessment.age >= 85 ? "充裕享老" : (longevityAssessment.age >= 80 ? "達台灣均壽" : "建議強化")))
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(UIColor.tertiarySystemFill))
                                .clipShape(Capsule())
                        }
                        .padding(10)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                    .padding(.vertical, 4)
                }
                
                // 設定區域
                Section(
                    header: Text("1. 生活目標與提領哲學"),
                    footer: Text("生活費請填寫「現在」的物價感覺。可自由選擇「4% 永續留本」或「平滑花光至特定壽命（免留遺產）」。")
                ) {
                    HStack {
                        Text("目前年齡")
                        Spacer()
                        TextField("例如 35", value: $currentAge, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    Stepper("預計退休年齡：\(retireAge) 歲", value: $retireAge, in: 40...80)
                    
                    HStack {
                        Text("期望每月生活費")
                        Spacer()
                        TextField("例如 40000", value: $targetToday, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    HStack {
                        Text("微型兼職月收入")
                        Spacer()
                        TextField("無填 0", value: $partTime, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    HStack {
                        Text("長期年通膨率 (%)")
                        Spacer()
                        TextField("建議 2.0", value: $inflation, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Button(action: { showHelp("通膨率與提領", "通膨率一般建議抓 2%~2.5%。\n系統會以實質購買力精密折現。") }) {
                            Image(systemName: "info.circle").foregroundColor(.blue)
                        }
                    }
                    
                    // 提領模型切換
                    Picker("提領規劃模式", selection: $withdrawalMode) {
                        ForEach(WithdrawalMode.allCases) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    
                    if withdrawalMode == .perpetual {
                        HStack {
                            Text("年化安全提領率 (%)")
                            Spacer()
                            TextField("建議 4.0", value: $withdrawRate, format: .number)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 80)
                            Button(action: { showHelp("4% 安全提領法則", "以4%作為退休初始提領率估算。\n實際退休結果仍會受到市場波動、報酬順序、通膨與退休年限影響。") }) {
                                Image(systemName: "info.circle").foregroundColor(.blue)
                            }
                        }
                    } else {
                        Stepper("預期規劃享老壽命：\(Int(lifeExpectancy)) 歲", value: $lifeExpectancy, in: Double(retireAge + 1)...100, step: 1)
                    }
                }
                
                Section(
                    header: Text("2. 政府保障 (勞保與勞退)"),
                    footer: Text("不知道自己的年資與餘額？可下載「勞保局行動服務 App」或透過「健保卡+戶口名簿戶號」至勞保局e化服務系統查詢。")
                ) {
                    Stepper("勞保請領年齡：\(claimAge) 歲", value: $claimAge, in: 60...70)
                    
                    HStack {
                        Text("目前勞保年資")
                        Spacer()
                        TextField("年", value: $laborYearsNow, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("勞退專戶餘額")
                        Spacer()
                        TextField("元", value: $pensionBalance, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Button(action: { showHelp("勞退專戶是什麼？", "這是雇主每月幫您提撥 6% 的專戶，您可以額外自提 0%~6%。就算公司倒閉，這筆錢也絕對是您的。") }) {
                            Image(systemName: "info.circle").foregroundColor(.blue)
                        }
                    }
                    Toggle("退職時勞退一次領出（注入股票池）", isOn: $isPensionLumpSum)
                }
                
                Section(
                    header: Text("3. 自有資金投資"),
                    footer: Text("建議將資金投入大盤指數型 ETF (如 0050 或 VOO)，長期歷史年化報酬率約有 7%~10%。")
                ) {
                    HStack {
                        Text("目前已投資本金")
                        Spacer()
                        TextField("元", value: $assetsNow, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("未來每月定期定額")
                        Spacer()
                        TextField("元", value: $monthlyInvest, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("預期年化報酬 (%)")
                        Spacer()
                        TextField("建議 7~8", value: $expectedReturn, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Button(action: { showHelp("預期年化報酬", "美股 S&P500 過去百年平均年化報酬約 10%，台股 0050 約 9%。保守估計可填寫 7% 或 8%。") }) {
                            Image(systemName: "info.circle").foregroundColor(.blue)
                        }
                    }
                }
            }
            .navigationTitle("退休精算機")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("完成") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .font(.headline)
                }
            }
            .sheet(isPresented: $showingHelpSheet) {
                HelpSheetView(topic: helpTopic)
                    .presentationDetents([.fraction(0.35)])
            }
        }
    }
    
    private func showHelp(_ title: String, _ content: String) {
        helpTopic = content
        showingHelpSheet = true
    }
}

struct HelpSheetView: View {
    let topic: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 16) {
            Text("小提示")
                .font(.headline)
                .padding(.top, 24)
            
            Text(topic)
                .font(.body)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            
            Spacer()
            
            Button(action: { dismiss() }) {
                Text("我知道了")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
    }
}

struct MetricCell: View {
    let title: String
    let value: Double
    
    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            
            Text(value, format: .currency(code: "TWD").precision(.fractionLength(0)))
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .padding(.horizontal, 4)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
}

#Preview {
    RetirementSimulatorView()
}
