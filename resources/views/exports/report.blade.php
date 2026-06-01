<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

.header { background: #0f172a; color: #fff; padding: 24px 32px; margin-bottom: 24px; }
.header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
.header p { font-size: 11px; color: #94a3b8; margin-top: 4px; }

.section { margin: 0 32px 24px; }
.section-title { font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

.stats-grid { display: flex; gap: 12px; margin: 0 32px 24px; }
.stat-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
.stat-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.stat-card .value { font-size: 18px; font-weight: 700; color: #0f172a; }
.stat-card.green .value { color: #16a34a; }
.stat-card.red .value { color: #dc2626; }

table { width: 100%; border-collapse: collapse; }
th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; }
td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; color: #334155; }
tr:last-child td { border-bottom: none; }
.amount { text-align: right; font-weight: 600; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 600; }
.badge-red { background: #fee2e2; color: #dc2626; }
.badge-green { background: #dcfce7; color: #16a34a; }

.progress-bar { background: #e2e8f0; border-radius: 4px; height: 6px; margin-top: 4px; }
.progress-fill { background: #f5c842; border-radius: 4px; height: 6px; }

.footer { margin-top: 32px; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
    <h1>FinPilot AI — Monthly Report</h1>
    <p>{{ $monthLabel }} &nbsp;·&nbsp; {{ $user->name }} &nbsp;·&nbsp; Generated {{ now()->format('d M Y, H:i') }}</p>
</div>

<!-- Summary stats -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="label">Monthly Income</div>
        <div class="value">₹{{ number_format($income, 0) }}</div>
    </div>
    <div class="stat-card red">
        <div class="label">Total Expenses</div>
        <div class="value">₹{{ number_format($totalExpenses, 0) }}</div>
    </div>
    <div class="stat-card {{ $savings >= 0 ? 'green' : 'red' }}">
        <div class="label">Net Savings</div>
        <div class="value">₹{{ number_format(abs($savings), 0) }}{{ $savings < 0 ? ' (deficit)' : '' }}</div>
    </div>
    <div class="stat-card">
        <div class="label">Savings Rate</div>
        <div class="value">{{ $income > 0 ? round(($savings / $income) * 100) : 0 }}%</div>
    </div>
</div>

<!-- Category breakdown -->
@if($byCategory->count())
<div class="section">
    <div class="section-title">Spending by Category</div>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Transactions</th>
                <th class="amount">Amount</th>
                <th class="amount">% of Expenses</th>
            </tr>
        </thead>
        <tbody>
            @foreach($byCategory as $cat)
            <tr>
                <td>{{ $cat['name'] }}</td>
                <td>{{ $cat['count'] }}</td>
                <td class="amount">₹{{ number_format($cat['total'], 2) }}</td>
                <td class="amount">{{ $totalExpenses > 0 ? round(($cat['total'] / $totalExpenses) * 100, 1) : 0 }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

<!-- Budget status -->
@if($budgets->count())
<div class="section">
    <div class="section-title">Budget Status</div>
    <table>
        <thead>
            <tr>
                <th>Budget</th>
                <th class="amount">Limit</th>
                <th class="amount">Spent</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($budgets as $b)
            <tr>
                <td>{{ $b['name'] }}</td>
                <td class="amount">₹{{ number_format($b['limit'], 0) }}</td>
                <td class="amount">₹{{ number_format($b['spent'], 0) }}</td>
                <td>
                    @if($b['is_breached'])
                    <span class="badge badge-red">Over Budget</span>
                    @else
                    <span class="badge badge-green">On Track</span>
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

<!-- Goals -->
@if($goals->count())
<div class="section">
    <div class="section-title">Financial Goals</div>
    <table>
        <thead>
            <tr>
                <th>Goal</th>
                <th class="amount">Target</th>
                <th class="amount">Saved</th>
                <th>Progress</th>
            </tr>
        </thead>
        <tbody>
            @foreach($goals as $g)
            <tr>
                <td>{{ $g['name'] }}</td>
                <td class="amount">₹{{ number_format($g['target'], 0) }}</td>
                <td class="amount">₹{{ number_format($g['saved'], 0) }}</td>
                <td>{{ $g['progress'] }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

<!-- Transaction list -->
<div class="section">
    <div class="section-title">All Transactions ({{ $expenses->count() }})</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Mode</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($expenses as $e)
            <tr>
                <td>{{ $e->expense_date->format('d M') }}</td>
                <td>{{ Str::limit($e->description ?? ($e->merchant ?? 'Expense'), 35) }}</td>
                <td>{{ $e->category?->name ?? '—' }}</td>
                <td>{{ strtoupper($e->payment_mode ?? '—') }}</td>
                <td class="amount">₹{{ number_format($e->amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>

<div class="footer">
    FinPilot AI &nbsp;·&nbsp; Personal Finance Manager &nbsp;·&nbsp; This report is for personal use only
</div>

</body>
</html>
