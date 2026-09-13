import SwiftUI

struct RetirementSimulatorView: View {
    // MARK: - Generic Default Data (新使用者預設值)
    @State private var currentAge: Double = 35.0
    @State private var retireAge: Int = 65
    @State private var targetToday: Int = 40000
    @State private var inflation: Double = 2.0
    @State private var partTime: Int = 0
    @State private var withdrawRate: Double = 4.0
    
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
        pow(1 + inflation / 100.0, yearsToRetire)
    }
    
    private var targetNominal: Double {
        Double(targetToday) * inflationFactor
    }
    
    private var partTimeNominal: Double {
        Double(partTime) * inflationFactor
    }
    
    // 複利公式
    private func futureValue(pv: Double, pmt: Double, rate: Double, months: Int) -> Double {
        if months <= 0 { return pv }
        let r = pow(1 + rate, 1.0/12.0) - 1
        if abs(r) < 1e-10 { return pv + pmt * Double(months) }
        return pv * pow(1 + r, Double(months)) + pmt * (pow(1 + r, Double(months)) - 1) / r
    }
    
    private var totalProjected: Double {
        let months = Int(yearsToRetire * 12)
        let netReturn = (expectedReturn - fee) / 100.0
        let etfProjected = futureValue(pv: Double(assetsNow), pmt: Double(monthlyInvest), rate: netReturn, months: months)
        
        let pensionMonthlyPmt = Double(pensionWage) * (0.06 + Double(selfRate) / 100.0)
        let pensionTotal = futureValue(pv: Double(pensionBalance), pmt: pensionMonthlyPmt, rate: pensionReturn / 100.0, months: months)
        
        return etfProjected + (isPensionLumpSum ? pensionTotal : 0)
    }
    
    private var laborFullMonthly: Double {
        let totalYears = laborYearsNow + futureLaborYears
        let base = max(Double(avgInsuredSalary) * totalYears * 0.00775 + 3000, Double(avgInsuredSalary) * totalYears * 0.0155)
        let diff = max(-5.0, min(5.0, Double(claimAge - 65)))
        return base * (1 + diff * 0.04)
    }
    
    private var requiredAssets: Double {
        let wr = withdrawRate / 100.0
        let pensionMonths = Int(yearsToRetire * 12)
        let pensionMonthlyPmt = Double(pensionWage) * (0.06 + Double(selfRate) / 100.0)
        let pensionTotal = futureValue(pv: Double(pensionBalance), pmt: pensionMonthlyPmt, rate: pensionReturn / 100.0, months: pensionMonths)
        let pensionMonthly = isPensionLumpSum ? 0 : (pensionTotal / (24.0 * 12.0))
        
        var req = 0.0
        if claimAge > retireAge {
            let bridgeYears = Double(claimAge - retireAge)
            let bridgeGap = max(0, targetNominal - pensionMonthly - partTimeNominal)
            let endgameGap = max(0, targetNominal - laborFullMonthly - pensionMonthly - partTimeNominal)
            
            let bridgeRequired = bridgeGap * 12 * bridgeYears
            let endgameRequired = wr > 0 ? (endgameGap * 12 / wr) : 0
            req = bridgeRequired + endgameRequired
        } else {
            let laborAtRetire = laborFullMonthly
            let gap = max(0, targetNominal - laborAtRetire - pensionMonthly - partTimeNominal)
            req = wr > 0 ? (gap * 12 / wr) : 0
        }
        return req
    }
    
    private var shortfall: Double {
        max(0, requiredAssets - totalProjected)
    }
    
    private var readiness: Double {
        requiredAssets > 0 ? min(1.0, totalProjected / requiredAssets) : 1.0
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
                    VStack(spacing: 20) {
                        // 缺口 Hero
                        VStack(spacing: 8) {
                            Text("退休資金缺口")
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
                        .padding(.vertical, 10)
                        
                        // 現在、未來、目標 (Triad)
                        HStack(spacing: 12) {
                            MetricCell(title: "【現在】已備", value: currentTotalAssets)
                            MetricCell(title: "【未來】累積", value: totalProjected)
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
                    }
                    .padding(.vertical, 8)
                }
                
                // 設定區域
                Section(
                    header: Text("1. 生活目標與提領"),
                    footer: Text("生活費請填寫「現在」的物價感覺，系統會自動幫您計算通膨後的實際所需金額。")
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
                        Text("長期年通膨率 (%)")
                        Spacer()
                        TextField("建議 2.0", value: $inflation, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Button(action: { showHelp("通膨率與提領", "通膨率一般建議抓 2%~2.5%。\n另外系統預設您的資產提領率為 4%（著名的 4% 法則），確保退休後資金不會枯竭。") }) {
                            Image(systemName: "info.circle").foregroundColor(.blue)
                        }
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
                    Toggle("退職時勞退一次領出", isOn: $isPensionLumpSum)
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
