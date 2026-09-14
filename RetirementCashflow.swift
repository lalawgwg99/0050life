import Foundation

// MARK: - 單一年度現金流紀錄
public struct CashflowYear {
    public let age: Int
    public let yearOfRetirement: Int
    
    public let startingAssets: Double
    public let investmentReturn: Double
    
    // 支出
    public let expense: Double
    
    // 收入
    public let laborIncome: Double
    public let pensionIncome: Double
    public let partTimeIncome: Double
    
    // 從資產池提領
    public let withdrawal: Double
    
    public let endingAssets: Double
    public let isDepleted: Bool
}

// MARK: - 逐年現金流引擎
public struct RetirementCashflow {
    
    /// 產生從退休年齡至目標壽命的逐年「名目 (Nominal)」現金流陣列
    ///
    /// 預設勞保會隨通膨調整 (抗通膨)，勞退新制月退與一般年金不隨通膨調整。
    public static func generate(
        startAge: Int,
        targetAge: Int = 100,
        initialAssets: Double,
        initialExpenseYearly: Double,
        inflationRate: Double,
        nominalReturnRate: Double,
        laborIncomeYearly: Double,
        laborStartAge: Int,
        pensionIncomeYearly: Double,
        pensionStartAge: Int,
        partTimeIncomeYearly: Double,
        isLaborInflationAdjusted: Bool = true
    ) -> [CashflowYear] {
        
        var flow: [CashflowYear] = []
        var currentAssets = initialAssets
        
        for age in startAge...targetAge {
            let yearIndex = age - startAge + 1
            let startingAssets = currentAssets
            
            let yearsElapsed = Double(yearIndex - 1)
            let currentInflationFactor = pow(1.0 + inflationRate, yearsElapsed)
            
            // 當年度開銷 (受通膨影響)
            let expense = initialExpenseYearly * currentInflationFactor
            
            // 當年度勞保 (受通膨影響)
            var labor = 0.0
            if age >= laborStartAge {
                labor = isLaborInflationAdjusted ? (laborIncomeYearly * currentInflationFactor) : laborIncomeYearly
            }
            
            // 當年度勞退 (無通膨調整機制)
            let pension = (age >= pensionStartAge) ? pensionIncomeYearly : 0.0
            
            // 兼職收入 (假定購買力維持不變，名目跟隨通膨)
            let partTime = partTimeIncomeYearly * currentInflationFactor
            
            let totalFixedIncome = labor + pension + partTime
            
            // 提領缺口
            var shortfall = expense - totalFixedIncome
            if shortfall < 0 { shortfall = 0 }
            
            var withdrawal = shortfall
            if withdrawal > currentAssets {
                withdrawal = currentAssets
            }
            
            // 本金扣除提領後，剩餘部分參與投資 (假設年初提領)
            currentAssets -= withdrawal
            
            let investmentReturn = currentAssets * nominalReturnRate
            currentAssets += investmentReturn
            
            let isDepleted = currentAssets <= 0
            
            let yearRecord = CashflowYear(
                age: age,
                yearOfRetirement: yearIndex,
                startingAssets: startingAssets,
                investmentReturn: investmentReturn,
                expense: expense,
                laborIncome: labor,
                pensionIncome: pension,
                partTimeIncome: partTime,
                withdrawal: withdrawal,
                endingAssets: currentAssets,
                isDepleted: isDepleted
            )
            
            flow.append(yearRecord)
            
            // 若資產小於等於 0，避免產生負債滾利，將其重置為 0
            if currentAssets < 0 { currentAssets = 0 }
        }
        
        return flow
    }
}
