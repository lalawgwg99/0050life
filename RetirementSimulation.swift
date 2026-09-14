import Foundation

// MARK: - 單一情境的模擬結果
public struct ScenarioResult {
    public let scenario: RetirementCalculation.ReturnScenario
    public let nominalReturnRate: Double 
    
    // 退休起點狀態 (累積期結果)
    public let projectedStockAssets: Double
    public let projectedPensionLump: Double
    public let netStockEquity: Double
    
    // 終局結果 (消耗期結果)
    public let cashflow: [CashflowYear]
    public let ageDepleted: Int
    public let remainingAt100: Double
    public let lowestAsset: Double
    
    public var isPerpetual: Bool {
        return ageDepleted == 999
    }
}

// MARK: - 退休模擬引擎 (整合器)
public struct RetirementSimulation {
    
    // 將使用者的所有輸入統一打包
    public struct InputParameters {
        public let currentAge: Int
        public let retireAge: Int
        
        public let targetTodayExpense: Double
        public let inflationRate: Double
        public let feeRate: Double
        
        public let baseGrossReturn: Double
        
        public let assetsNow: Double
        public let monthlyInvest: Double
        
        // 勞保
        public let laborClaimAge: Int
        public let laborYears: Double
        public let avgInsuredSalary: Double
        
        // 勞退
        public let pensionBalance: Double
        public let pensionWage: Double
        public let pensionSelfRate: Double
        public let pensionReturnRate: Double
        public let isPensionLumpSum: Bool
        
        // 兼職
        public let partTimeIncome: Double
        
        public init(
            currentAge: Int, retireAge: Int, targetTodayExpense: Double, inflationRate: Double,
            feeRate: Double, baseGrossReturn: Double, assetsNow: Double, monthlyInvest: Double,
            laborClaimAge: Int, laborYears: Double, avgInsuredSalary: Double,
            pensionBalance: Double, pensionWage: Double, pensionSelfRate: Double, pensionReturnRate: Double, isPensionLumpSum: Bool,
            partTimeIncome: Double
        ) {
            self.currentAge = currentAge; self.retireAge = retireAge; self.targetTodayExpense = targetTodayExpense
            self.inflationRate = inflationRate; self.feeRate = feeRate; self.baseGrossReturn = baseGrossReturn
            self.assetsNow = assetsNow; self.monthlyInvest = monthlyInvest; self.laborClaimAge = laborClaimAge
            self.laborYears = laborYears; self.avgInsuredSalary = avgInsuredSalary
            self.pensionBalance = pensionBalance; self.pensionWage = pensionWage; self.pensionSelfRate = pensionSelfRate
            self.pensionReturnRate = pensionReturnRate; self.isPensionLumpSum = isPensionLumpSum
            self.partTimeIncome = partTimeIncome
        }
    }
    
    public struct SimulationReport {
        public let conservative: ScenarioResult
        public let base: ScenarioResult
        public let optimistic: ScenarioResult
    }
    
    public static func run(input: InputParameters) -> SimulationReport {
        let yearsToRetire = max(0, Double(input.retireAge - input.currentAge))
        let monthsToRetire = Int(yearsToRetire * 12)
        
        // 1. 估算勞保月領金額 (法定 65 歲，加減 20%)
        let statutoryAge = 65
        let baseLabor = max(input.avgInsuredSalary * input.laborYears * 0.00775 + 3000, input.avgInsuredSalary * input.laborYears * 0.0155)
        let diff = max(-5.0, min(5.0, Double(input.laborClaimAge - statutoryAge)))
        let laborFullMonthly = baseLabor * (1 + diff * 0.04)
        
        // 2. 跑三種情境
        let conservative = generateScenario(scenario: .conservative, input: input, monthsToRetire: monthsToRetire, laborMonthly: laborFullMonthly)
        let base = generateScenario(scenario: .base, input: input, monthsToRetire: monthsToRetire, laborMonthly: laborFullMonthly)
        let optimistic = generateScenario(scenario: .optimistic, input: input, monthsToRetire: monthsToRetire, laborMonthly: laborFullMonthly)
        
        return SimulationReport(conservative: conservative, base: base, optimistic: optimistic)
    }
    
    private static func generateScenario(
        scenario: RetirementCalculation.ReturnScenario,
        input: InputParameters,
        monthsToRetire: Int,
        laborMonthly: Double
    ) -> ScenarioResult {
        
        // A. 報酬率設定
        let grossReturn = scenario.rate(base: input.baseGrossReturn)
        let netReturn = RetirementCalculation.netAnnualReturn(grossReturn: grossReturn, annualFee: input.feeRate)
        
        // B. 累積期資產 (FV)
        let projectedStock = RetirementCalculation.futureValue(
            pv: input.assetsNow,
            pmt: input.monthlyInvest,
            annualRate: netReturn,
            months: monthsToRetire,
            contributionAtBeginning: false
        )
        
        let pensionMonthlyPmt = input.pensionWage * (0.06 + input.pensionSelfRate)
        let projectedPension = RetirementCalculation.futureValue(
            pv: input.pensionBalance,
            pmt: pensionMonthlyPmt,
            annualRate: input.pensionReturnRate,
            months: monthsToRetire,
            contributionAtBeginning: false
        )
        
        // 退休資產總額
        let initialAssets = projectedStock + (input.isPensionLumpSum ? projectedPension : 0)
        
        // 勞退若不一次領出，則計算月退 (簡化為定額，不抗通膨)
        let pensionFactor = (input.retireAge >= 65) ? 207.24 : 242.88
        let pensionMonthly = input.isPensionLumpSum ? 0 : (projectedPension / pensionFactor)
        
        // C. 生成逐年現金流 (退休消耗期)
        let cashflows = RetirementCashflow.generate(
            startAge: input.retireAge,
            targetAge: 100,
            initialAssets: initialAssets,
            initialExpenseYearly: input.targetTodayExpense * 12,
            inflationRate: input.inflationRate,
            nominalReturnRate: netReturn,
            laborIncomeYearly: laborMonthly * 12,
            laborStartAge: input.laborClaimAge,
            pensionIncomeYearly: pensionMonthly * 12,
            pensionStartAge: input.retireAge,
            partTimeIncomeYearly: input.partTimeIncome * 12,
            isLaborInflationAdjusted: true
        )
        
        // D. 結算終局指標
        let depletionYear = cashflows.first(where: { $0.isDepleted })
        let ageDepleted = depletionYear?.age ?? 999
        let remainingAt100 = cashflows.last?.endingAssets ?? 0.0
        let lowestAsset = cashflows.map { $0.endingAssets }.min() ?? 0.0
        
        return ScenarioResult(
            scenario: scenario,
            nominalReturnRate: netReturn,
            projectedStockAssets: projectedStock,
            projectedPensionLump: projectedPension,
            netStockEquity: initialAssets,
            cashflow: cashflows,
            ageDepleted: ageDepleted,
            remainingAt100: remainingAt100,
            lowestAsset: lowestAsset
        )
    }
}
