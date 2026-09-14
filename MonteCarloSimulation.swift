import Foundation

public struct MonteCarloResult {
    public let successRate: Double // 0.0 ~ 1.0
    public let medianRemainingAssetsAt100: Double
    public let worstCaseAgeDepleted: Int
}

public struct MonteCarloSimulation {
    
    /// 執行蒙地卡羅模擬
    /// - Parameters:
    ///   - input: 基礎參數
    ///   - iterations: 模擬次數 (預設 1000)
    ///   - volatility: 年化波動度 (預設 0.15, 即 15%)
    public static func run(
        input: RetirementSimulation.InputParameters,
        iterations: Int = 1000,
        volatility: Double = 0.15
    ) -> MonteCarloResult {
        
        let yearsToRetire = max(0, Double(input.retireAge - input.currentAge))
        let monthsToRetire = Int(yearsToRetire * 12)
        
        // 勞保
        let statutoryAge = 65
        let baseLabor = max(input.avgInsuredSalary * input.laborYears * 0.00775 + 3000, input.avgInsuredSalary * input.laborYears * 0.0155)
        let diff = max(-5.0, min(5.0, Double(input.laborClaimAge - statutoryAge)))
        let laborFullMonthly = baseLabor * (1 + diff * 0.04)
        
        // 為了效能，勞退在累積期視為穩定無波動
        let pensionMonthlyPmt = input.pensionWage * (0.06 + input.pensionSelfRate)
        let projectedPension = RetirementCalculation.futureValue(
            pv: input.pensionBalance, pmt: pensionMonthlyPmt,
            annualRate: input.pensionReturnRate, months: monthsToRetire, contributionAtBeginning: false
        )
        let pensionFactor = (input.retireAge >= 65) ? 207.24 : 242.88
        let pensionMonthly = input.isPensionLumpSum ? 0 : (projectedPension / pensionFactor)
        
        var successCount = 0
        var remainingAssetsList: [Double] = []
        var earliestDepletion = 999
        
        let targetAge = 100
        
        // 常態分佈亂數產生器 (Box-Muller)
        func gaussianRandom() -> Double {
            var u1 = Double.random(in: 0..<1)
            let u2 = Double.random(in: 0..<1)
            while u1 <= 1e-10 { u1 = Double.random(in: 0..<1) }
            return sqrt(-2.0 * log(u1)) * cos(2.0 * .pi * u2)
        }
        
        for _ in 0..<iterations {
            
            // 累積期模擬 (簡化：以總期間產生單一報酬)
            // 這裡可以做逐年，但為效能暫用平均法。更精確應逐年跑，但累積期對「失敗率」影響是初值的偏移。
            // 這裡採取：直接讓「退休時資產」產生常態偏移
            let meanReturn = input.baseGrossReturn
            
            // 嚴謹做法：退休後逐年跑隨機報酬
            // 但退休前本金也需隨機嗎？是。我們來跑「退休後」的逐年亂數。
            // 退休前的本金我們先用固定預期 (或者簡單加入一點總體波動)
            // 為確保模型不過度複雜，我們將波動度集中在「退休後」的逐年提領測試 (Sequence of Returns Risk)
            let projectedStock = RetirementCalculation.futureValue(
                pv: input.assetsNow, pmt: input.monthlyInvest,
                annualRate: RetirementCalculation.netAnnualReturn(grossReturn: meanReturn, annualFee: input.feeRate),
                months: monthsToRetire, contributionAtBeginning: false
            )
            
            let initialAssets = projectedStock + (input.isPensionLumpSum ? projectedPension : 0)
            
            // 退休後逐年
            var currentAssets = initialAssets
            var isDepleted = false
            var depletedAge = 999
            
            for age in input.retireAge...targetAge {
                let yearIndex = age - input.retireAge + 1
                let currentInflationFactor = pow(1.0 + input.inflationRate, Double(yearIndex - 1))
                
                let expense = (input.targetTodayExpense * 12) * currentInflationFactor
                let labor = (age >= input.laborClaimAge) ? (laborFullMonthly * 12 * currentInflationFactor) : 0
                let pension = (age >= input.retireAge) ? (pensionMonthly * 12) : 0
                let partTime = (input.partTimeIncome * 12) * currentInflationFactor
                
                let totalFixed = labor + pension + partTime
                var shortfall = expense - totalFixed
                if shortfall < 0 { shortfall = 0 }
                
                var withdrawal = shortfall
                if withdrawal > currentAssets { withdrawal = currentAssets }
                
                currentAssets -= withdrawal
                
                if currentAssets <= 0 && !isDepleted {
                    isDepleted = true
                    depletedAge = age
                }
                
                // 隨機年度報酬
                let randomNormal = gaussianRandom() // N(0,1)
                let yearGrossReturn = meanReturn + randomNormal * volatility
                let yearNetReturn = RetirementCalculation.netAnnualReturn(grossReturn: yearGrossReturn, annualFee: input.feeRate)
                
                currentAssets *= (1.0 + yearNetReturn)
                if currentAssets < 0 { currentAssets = 0 }
            }
            
            if !isDepleted {
                successCount += 1
            } else {
                earliestDepletion = min(earliestDepletion, depletedAge)
            }
            remainingAssetsList.append(currentAssets)
        }
        
        let successRate = Double(successCount) / Double(iterations)
        
        remainingAssetsList.sort()
        let medianRemaining = remainingAssetsList[iterations / 2]
        
        return MonteCarloResult(
            successRate: successRate,
            medianRemainingAssetsAt100: medianRemaining,
            worstCaseAgeDepleted: earliestDepletion
        )
    }
}
