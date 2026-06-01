<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

.header { background: #0f172a; color: #fff; padding: 24px 32px; margin-bottom: 24px; }
.header h1 { font-size: 22px; font-weight: 700; }
.header p  { font-size: 11px; color: #94a3b8; margin-top: 4px; }

.section { margin: 0 32px 20px; }
.section-title { font-size: 12px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

.kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
.kv:last-child { border-bottom: none; }
.kv .label { color: #64748b; }
.kv .value { font-weight: 600; color: #0f172a; }
.kv .value.green { color: #16a34a; }
.kv .value.blue  { color: #2563eb; }
.kv .value.red   { color: #dc2626; }

table { width: 100%; border-collapse: collapse; }
th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; }
td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; }
tr:last-child td { border-bottom: none; }
.amt { text-align: right; font-weight: 600; }

.summary-box { margin: 0 32px 20px; background: #0f172a; border-radius: 8px; padding: 16px 20px; color: #fff; }
.summary-box h2 { font-size: 13px; color: #94a3b8; margin-bottom: 10px; }
.summary-grid { display: flex; gap: 16px; }
.summary-item .s-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
.summary-item .s-value { font-size: 17px; font-weight: 700; color: #fff; margin-top: 2px; }
.summary-item .s-value.amber { color: #f59e0b; }
.summary-item .s-value.green { color: #10b981; }

.disclaimer { margin: 0 32px; font-size: 9px; color: #94a3b8; font-style: italic; line-height: 1.5; }
.footer { margin-top: 24px; padding: 12px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
    <h1>FinPilot AI — Tax Summary</h1>
    <p>Financial Year {{ $year }}-{{ $year + 1 }} &nbsp;·&nbsp; {{ $user->name }} &nbsp;·&nbsp; Generated {{ now()->format('d M Y') }}</p>
</div>

<!-- Income summary -->
<div class="section">
    <div class="section-title">Income Summary</div>
    <div class="kv"><span class="label">Gross Salary Income (annual estimate)</span><span class="value">₹{{ number_format($grossIncome, 0) }}</span></div>
    <div class="kv"><span class="label">Standard Deduction (Section 16)</span><span class="value green">− ₹{{ number_format($standardDeduction, 0) }}</span></div>
    <div class="kv"><span class="label">Total 80C Deductions (claimed)</span><span class="value green">− ₹{{ number_format($total80c, 0) }}</span></div>
    @if($homeLoanInterestCapped > 0)
    <div class="kv"><span class="label">Home Loan Interest (Section 24b)</span><span class="value green">− ₹{{ number_format($homeLoanInterestCapped, 0) }}</span></div>
    @endif
    <div class="kv"><span class="label" style="font-weight:700;color:#0f172a">Estimated Taxable Income</span><span class="value blue">₹{{ number_format($taxableIncome, 0) }}</span></div>
    <div class="kv"><span class="label" style="font-weight:700;color:#0f172a">Estimated Tax Liability (old regime)</span><span class="value red">₹{{ number_format($tax, 0) }}</span></div>
</div>

<!-- 80C breakdown -->
<div class="section">
    <div class="section-title">Section 80C Investments (limit: ₹1,50,000)</div>
    @if($investments80c->count())
    <table>
        <thead><tr><th>Investment</th><th>Type</th><th class="amt">Amount</th></tr></thead>
        <tbody>
            @foreach($investments80c as $inv)
            <tr>
                <td>{{ $inv['name'] }}</td>
                <td>{{ $inv['type'] }}</td>
                <td class="amt">₹{{ number_format($inv['amount'], 0) }}</td>
            </tr>
            @endforeach
            <tr style="background:#f8fafc;">
                <td colspan="2" style="font-weight:700;">Total Claimed (capped at ₹1,50,000)</td>
                <td class="amt" style="font-weight:700;color:#16a34a;">₹{{ number_format($total80c, 0) }}</td>
            </tr>
        </tbody>
    </table>
    @else
    <p style="color:#94a3b8;font-size:10.5px;padding:10px 0;">No 80C investments recorded for this year. Add mutual funds, PPF, or ELSS investments to track deductions.</p>
    @endif
</div>

<!-- Summary box -->
<div class="summary-box">
    <h2>Tax Estimate Summary (Old Tax Regime)</h2>
    <div class="summary-grid">
        <div class="summary-item">
            <div class="s-label">Gross Income</div>
            <div class="s-value">₹{{ number_format($grossIncome, 0) }}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Total Deductions</div>
            <div class="s-value green">₹{{ number_format($totalDeductions + $standardDeduction, 0) }}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Taxable Income</div>
            <div class="s-value amber">₹{{ number_format($taxableIncome, 0) }}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Est. Tax Payable</div>
            <div class="s-value" style="color:#ef4444;">₹{{ number_format($tax, 0) }}</div>
        </div>
    </div>
</div>

<div class="disclaimer">
    * This is an estimate based on data recorded in FinPilot AI. Income figures are annualised from your monthly active income sources.
    Tax computed under the old regime using FY {{ $year }}-{{ $year + 1 }} slabs (₹0–2.5L: Nil; ₹2.5L–5L: 5%; ₹5L–10L: 20%; above ₹10L: 30%).
    This document is for reference only — please consult a CA or tax advisor for filing.
</div>

<div class="footer">FinPilot AI &nbsp;·&nbsp; Tax Summary Report &nbsp;·&nbsp; For personal reference only</div>

</body>
</html>
