import Foundation

public struct RetirementCalculation {
    
    public enum ReturnScenario {
        case conservative
        case base
        case optimistic

        public func rate(base: Double) -> Double {
            switch self {
            case .conservative:
                return max(0, base - 0.02)
            case .base:
                return base
            case .optimistic:
                return base + 0.02
            }
        }
    }

    /// 年化報酬率轉月報酬率
    public static func monthlyRate(_ annualRate: Double) -> Double {
        pow(1.0 + annualRate, 1.0 / 12.0) - 1.0
    }

    /// 未來價值 (累積期資產)
    public static func futureValue(
        pv: Double,
        pmt: Double,
        annualRate: Double,
        months: Int,
        contributionAtBeginning: Bool = false
    ) -> Double {
        guard months > 0 else { return pv }
        let r = monthlyRate(annualRate)

        if abs(r) < 1e-12 {
            return pv + pmt * Double(months)
        }

        let growth = pow(1.0 + r, Double(months))
        var annuity = pmt * (growth - 1.0) / r
        if contributionAtBeginning {
            annuity *= (1.0 + r)
        }

        return pv * growth + annuity
    }

    /// 淨報酬率 (費用後)
    public static func netAnnualReturn(grossReturn: Double, annualFee: Double) -> Double {
        guard annualFee > -1 else { return grossReturn }
        return (1.0 + grossReturn) / (1.0 + annualFee) - 1.0
    }

    /// 實質報酬率 (通膨後)
    public static func realReturn(nominalReturn: Double, inflation: Double) -> Double {
        return (1.0 + nominalReturn) / (1.0 + inflation) - 1.0
    }

    /// 退休時生活費 (通膨計算)
    public static func inflatedValue(todayValue: Double, inflation: Double, years: Double) -> Double {
        return todayValue * pow(1.0 + inflation, max(0, years))
    }

    /// 年金現值 (平滑享老所需本金)
    public static func presentValueOfAnnuity(payment: Double, annualRate: Double, months: Int) -> Double {
        guard payment > 0, months > 0 else { return 0 }
        let r = monthlyRate(annualRate)
        if abs(r) < 1e-12 {
            return payment * Double(months)
        }
        return payment * (1.0 - pow(1.0 + r, -Double(months))) / r
    }

    /// 4% 提領模式所需本金
    public static func requiredAssetsByWithdrawalRate(annualNeed: Double, withdrawalRate: Double) -> Double {
        guard annualNeed > 0, withdrawalRate > 0 else { return 0 }
        return annualNeed / withdrawalRate
    }

    /// 退休資產可支撐月份 (反推 n)
    public static func depletionMonths(assets: Double, monthlyWithdrawal: Double, annualRealReturn: Double) -> Double {
        guard assets > 0 else { return 0 }
        guard monthlyWithdrawal > 0 else { return Double.infinity }

        let r = monthlyRate(annualRealReturn)
        if abs(r) < 1e-12 {
            return assets / monthlyWithdrawal
        }

        let x = 1.0 - (assets * r / monthlyWithdrawal)

        if r > 0 && x <= 0 {
            return Double.infinity
        }

        guard x > 0, 1.0 + r > 0 else {
            return simulatedDepletionMonths(assets: assets, monthlyWithdrawal: monthlyWithdrawal, monthlyRate: r)
        }

        return -log(x) / log(1.0 + r)
    }

    /// 負報酬率安全計算 (逐月模擬)
    public static func simulatedDepletionMonths(assets: Double, monthlyWithdrawal: Double, monthlyRate: Double, maxMonths: Int = 1200) -> Double {
        var balance = assets
        for month in 1...maxMonths {
            balance *= (1.0 + monthlyRate)
            balance -= monthlyWithdrawal
            if balance <= 0 { return Double(month) }
        }
        return Double(maxMonths)
    }

    /// 退休準備度
    public static func readiness(assets: Double, requiredAssets: Double) -> Double {
        guard requiredAssets > 0 else { return 1.0 }
        return min(1.0, max(0.0, assets / requiredAssets))
    }
}
