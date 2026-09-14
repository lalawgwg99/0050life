import SwiftUI

// MARK: - 主視圖 (Apple Health 風格 Wizard)
struct RetirementSimulatorView: View {
    
    // MARK: 狀態參數
    @State private var currentStep: Int = 0
    
    // 基本設定
    @State private var currentAge: Int = 35
    @State private var retireAge: Int = 65
    @State private var targetToday: Int = 40_000
    @State private var partTime: Int = 0
    @State private var inflation: Double = 2.0
    
    // 政府保障
    @State private var claimAge: Int = 65
    @State private var laborYearsNow: Double = 10.0
    @State private var futureLaborYears: Double = 30.0
    @State private var avgInsuredSalary: Int = 45800
    
    @State private var pensionBalance: Int = 300_000
    @State private var pensionWage: Int = 45800
    @State private var selfRate: Int = 6
    @State private var pensionReturn: Double = 3.0
    @State private var isPensionLumpSum: Bool = true
    
    // 自有投資
    @State private var assetsNow: Int = 500_000
    @State private var monthlyInvest: Int = 10_000
    @State private var expectedReturn: Double = 8.0
    @State private var fee: Double = 0.3
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 進度指示器
                ProgressHeader(currentStep: currentStep, totalSteps: 3)
                    .padding(.top)
                
                // 內容分頁
                TabView(selection: $currentStep) {
                    BasicInfoStep(currentAge: $currentAge, retireAge: $retireAge, targetToday: $targetToday, partTime: $partTime, inflation: $inflation)
                        .tag(0)
                    
                    GovernmentStep(claimAge: $claimAge, laborYearsNow: $laborYearsNow, futureLaborYears: $futureLaborYears, avgInsuredSalary: $avgInsuredSalary, pensionBalance: $pensionBalance, pensionWage: $pensionWage, selfRate: $selfRate, pensionReturn: $pensionReturn, isPensionLumpSum: $isPensionLumpSum)
                        .tag(1)
                    
                    InvestmentStep(assetsNow: $assetsNow, monthlyInvest: $monthlyInvest, expectedReturn: $expectedReturn, fee: $fee)
                        .tag(2)
                        
                    DashboardStep(input: generateInput())
                        .tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)
                
                // 底部按鈕
                BottomNavigation(currentStep: $currentStep)
            }
            .navigationTitle(navTitle)
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
        }
    }
    
    private var navTitle: String {
        switch currentStep {
        case 0: return "生活目標與提領設定"
        case 1: return "第一與第二支柱"
        case 2: return "自有投資組合"
        case 3: return "退休精算報告"
        default: return "0050 Life"
        }
    }
    
    private func generateInput() -> RetirementSimulation.InputParameters {
        return RetirementSimulation.InputParameters(
            currentAge: currentAge,
            retireAge: retireAge,
            targetTodayExpense: Double(targetToday),
            inflationRate: inflation / 100.0,
            feeRate: fee / 100.0,
            baseGrossReturn: expectedReturn / 100.0,
            assetsNow: Double(assetsNow),
            monthlyInvest: Double(monthlyInvest),
            laborClaimAge: claimAge,
            laborYears: laborYearsNow + futureLaborYears,
            avgInsuredSalary: Double(avgInsuredSalary),
            pensionBalance: Double(pensionBalance),
            pensionWage: Double(pensionWage),
            pensionSelfRate: Double(selfRate) / 100.0,
            pensionReturnRate: pensionReturn / 100.0,
            isPensionLumpSum: isPensionLumpSum,
            partTimeIncome: Double(partTime)
        )
    }
}

// MARK: - UI 元件
struct ProgressHeader: View {
    let currentStep: Int
    let totalSteps: Int
    var body: some View {
        HStack(spacing: 8) {
            ForEach(0...totalSteps, id: \.self) { index in
                Rectangle()
                    .fill(index <= currentStep ? Color.blue : Color(UIColor.tertiarySystemFill))
                    .frame(height: 4)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal)
    }
}

struct BottomNavigation: View {
    @Binding var currentStep: Int
    var body: some View {
        VStack {
            Divider()
            HStack {
                if currentStep > 0 {
                    Button(action: {
                        withAnimation { currentStep -= 1 }
                    }) {
                        Text("上一步")
                            .font(.headline)
                            .foregroundColor(.blue)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(12)
                    }
                }
                
                Button(action: {
                    withAnimation { currentStep += 1 }
                }) {
                    Text(currentStep == 3 ? "重新試算" : (currentStep == 2 ? "開始精算" : "下一步"))
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(currentStep == 3 ? Color.secondary : Color.blue)
                        .cornerRadius(12)
                }
            }
            .padding()
        }
        .background(Color(UIColor.systemGroupedBackground))
    }
}

// MARK: - 步驟視圖 (Apple Health Style Forms)
struct BasicInfoStep: View {
    @Binding var currentAge: Int
    @Binding var retireAge: Int
    @Binding var targetToday: Int
    @Binding var partTime: Int
    @Binding var inflation: Double
    
    var body: some View {
        Form {
            Section(header: Text("基本設定"), footer: Text("退休年齡決定了準備期的長短。生活費請以「現在的物價」填寫，系統會自動計入通膨。")) {
                Stepper("目前年齡：\(currentAge) 歲", value: $currentAge, in: 20...70)
                Stepper("預計退休年齡：\(retireAge) 歲", value: $retireAge, in: 40...80)
                
                HStack {
                    Text("期望每月生活費")
                    Spacer()
                    TextField("40000", value: $targetToday, format: .number)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                }
                HStack {
                    Text("退休兼職月收入")
                    Spacer()
                    TextField("0", value: $partTime, format: .number)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                }
                HStack {
                    Text("長期年通膨率 (%)")
                    Spacer()
                    TextField("2.0", value: $inflation, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
    }
}

struct GovernmentStep: View {
    @Binding var claimAge: Int
    @Binding var laborYearsNow: Double
    @Binding var futureLaborYears: Double
    @Binding var avgInsuredSalary: Int
    @Binding var pensionBalance: Int
    @Binding var pensionWage: Int
    @Binding var selfRate: Int
    @Binding var pensionReturn: Double
    @Binding var isPensionLumpSum: Bool
    
    var body: some View {
        Form {
            Section(header: Text("勞保老年年金"), footer: Text("系統會自動帶入法定 65 歲，並計算提前或延後請領的加減額比例 (±20%)。")) {
                Stepper("請領年齡：\(claimAge) 歲", value: $claimAge, in: 60...70)
                HStack { Text("目前已保年資"); Spacer(); TextField("年", value: $laborYearsNow, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                HStack { Text("未來預計再保年資"); Spacer(); TextField("年", value: $futureLaborYears, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                HStack { Text("最高 60 個月平均投保薪資"); Spacer(); TextField("元", value: $avgInsuredSalary, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
            }
            Section(header: Text("勞退新制專戶"), footer: Text("勞退為個人專戶，無破產風險。若選擇一次領，款項將注入自有投資池中產生收益。")) {
                HStack { Text("目前專戶餘額"); Spacer(); TextField("元", value: $pensionBalance, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                HStack { Text("目前提撥薪資"); Spacer(); TextField("元", value: $pensionWage, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                Stepper("自提比例：\(selfRate)%", value: $selfRate, in: 0...6)
                Toggle("退職時一次領出轉入投資池", isOn: $isPensionLumpSum)
            }
        }
    }
}

struct InvestmentStep: View {
    @Binding var assetsNow: Int
    @Binding var monthlyInvest: Int
    @Binding var expectedReturn: Double
    @Binding var fee: Double
    
    var body: some View {
        Form {
            Section(header: Text("自有資金與 ETF"), footer: Text("長期大盤指數 (如 S&P 500) 百年平均約有 10% 報酬。請填寫合理的預期報酬，系統將以此作為基準，為您跑出保守(-2%)與樂觀(+2%)的三種情境。")) {
                HStack { Text("目前已投資本金"); Spacer(); TextField("元", value: $assetsNow, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                HStack { Text("未來每月定期定額"); Spacer(); TextField("元", value: $monthlyInvest, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing) }
                HStack { Text("基準預期年化報酬 (%)"); Spacer(); TextField("8.0", value: $expectedReturn, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                HStack { Text("預估內扣費用 (%)"); Spacer(); TextField("0.3", value: $fee, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
            }
        }
    }
}

// MARK: - 儀表板 (Dashboard)
struct DashboardStep: View {
    let input: RetirementSimulation.InputParameters
    
    @State private var mcResult: MonteCarloResult?
    @State private var simReport: RetirementSimulation.SimulationReport?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let report = simReport, let mc = mcResult {
                    
                    // 1. 大盤面：成功率
                    VStack(spacing: 8) {
                        Text("退休成功率")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                        
                        Text("\(Int(mc.successRate * 100))%")
                            .font(.system(size: 64, weight: .bold, design: .rounded))
                            .foregroundStyle(mc.successRate >= 0.9 ? .green : (mc.successRate > 0.7 ? .orange : .red))
                        
                        if mc.successRate >= 0.9 {
                            Label("高度安全", systemImage: "checkmark.seal.fill")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.green)
                        } else {
                            Text("最差情況可能在 \(mc.worstCaseAgeDepleted) 歲耗盡")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 16)
                    
                    // 2. 三情境卡片
                    VStack(spacing: 12) {
                        ScenarioCard(title: "保守情境", subtitle: "報酬率 \((report.conservative.nominalReturnRate * 100).formatted(.number.precision(.fractionLength(1))))%", result: report.conservative, color: .orange)
                        
                        ScenarioCard(title: "基準情境", subtitle: "報酬率 \((report.base.nominalReturnRate * 100).formatted(.number.precision(.fractionLength(1))))%", result: report.base, color: .blue)
                        
                        ScenarioCard(title: "樂觀情境", subtitle: "報酬率 \((report.optimistic.nominalReturnRate * 100).formatted(.number.precision(.fractionLength(1))))%", result: report.optimistic, color: .green)
                    }
                    .padding(.horizontal)
                    
                    // 3. Monte Carlo 數據
                    VStack(alignment: .leading, spacing: 12) {
                        Text("蒙地卡羅壓力測試 (1000次)")
                            .font(.headline)
                            .padding(.bottom, 4)
                        
                        HStack {
                            VStack(alignment: .leading) {
                                Text("中位數 100 歲資產")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(mc.medianRemainingAssetsAt100, format: .currency(code: "TWD").precision(.fractionLength(0)))
                                    .font(.system(.body, design: .rounded).weight(.semibold))
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("最差耗盡年齡")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(mc.worstCaseAgeDepleted == 999 ? "永不耗盡" : "\(mc.worstCaseAgeDepleted) 歲")
                                    .font(.system(.body, design: .rounded).weight(.semibold))
                                    .foregroundStyle(mc.worstCaseAgeDepleted < 85 ? .red : .primary)
                            }
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                } else {
                    ProgressView("精算中...")
                        .padding(.top, 50)
                }
            }
            .padding(.bottom, 30)
        }
        .onAppear {
            runCalculations()
        }
    }
    
    private func runCalculations() {
        // 在背景執行以免卡頓 UI
        DispatchQueue.global(qos: .userInitiated).async {
            let report = RetirementSimulation.run(input: input)
            let mc = MonteCarloSimulation.run(input: input, iterations: 1000, volatility: 0.15)
            
            DispatchQueue.main.async {
                self.simReport = report
                self.mcResult = mc
            }
        }
    }
}

struct ScenarioCard: View {
    let title: String
    let subtitle: String
    let result: ScenarioResult
    let color: Color
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(title).font(.headline).foregroundStyle(color)
                    Text(subtitle).font(.caption2).foregroundStyle(.secondary)
                }
                
                HStack(spacing: 16) {
                    VStack(alignment: .leading) {
                        Text("退休時資產").font(.caption2).foregroundStyle(.secondary)
                        Text(result.netStockEquity, format: .currency(code: "TWD").precision(.fractionLength(0)))
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    }
                    VStack(alignment: .leading) {
                        Text("耗盡年齡").font(.caption2).foregroundStyle(.secondary)
                        if result.isPerpetual {
                            Text("永不耗盡").font(.system(.subheadline, design: .rounded).weight(.bold)).foregroundStyle(.green)
                        } else {
                            Text("\(result.ageDepleted) 歲").font(.system(.subheadline, design: .rounded).weight(.bold)).foregroundStyle(result.ageDepleted >= 90 ? .blue : .red)
                        }
                    }
                }
            }
            Spacer()
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

#Preview {
    RetirementSimulatorView()
}
