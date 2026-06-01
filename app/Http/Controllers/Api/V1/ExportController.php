<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use App\Models\Expense;
use App\Models\Goal;
use App\Models\IncomeSource;
use App\Models\Investment;
use App\Models\Budget;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use League\Csv\Writer;

class ExportController extends Controller
{
    public function expensesCsv(Request $request): Response
    {
        $user  = $request->user();
        $month = $request->input('month', now()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $expenses = Expense::where('user_id', $user->id)
            ->with('category:id,name')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->orderBy('expense_date')
            ->get();

        $csv = Writer::createFromString('');
        $csv->insertOne(['Date', 'Description', 'Category', 'Amount (INR)', 'Payment Mode', 'Merchant', 'Notes']);

        foreach ($expenses as $e) {
            $csv->insertOne([
                $e->expense_date->format('Y-m-d'),
                $e->description ?? '',
                $e->category?->name ?? 'Uncategorised',
                number_format($e->amount, 2, '.', ''),
                $e->payment_mode ?? '',
                $e->merchant ?? '',
                $e->notes ?? '',
            ]);
        }

        return response($csv->toString(), 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"expenses_{$month}.csv\"",
        ]);
    }

    public function reportPdf(Request $request): Response
    {
        $user  = $request->user();
        $month = $request->input('month', now()->format('Y-m'));

        [$year, $mon] = explode('-', $month);
        $monthLabel   = Carbon::createFromDate((int) $year, (int) $mon, 1)->format('F Y');

        $expenses = Expense::where('user_id', $user->id)
            ->with('category:id,name,color')
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $mon)
            ->orderBy('expense_date')
            ->get();

        $income = (float) IncomeSource::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('frequency', 'monthly')
            ->sum('amount');

        $totalExpenses = (float) $expenses->sum('amount');
        $savings       = $income - $totalExpenses;

        $byCategory = $expenses->groupBy(fn($e) => $e->category?->name ?? 'Uncategorised')
            ->map(fn($items, $cat) => [
                'name'  => $cat,
                'total' => round((float) $items->sum('amount'), 2),
                'count' => $items->count(),
                'color' => $items->first()->category?->color ?? '#6B7280',
            ])
            ->sortByDesc('total')
            ->values();

        $budgets = Budget::where('user_id', $user->id)
            ->where('period', 'monthly')
            ->where('is_active', true)
            ->get()
            ->map(fn($b) => [
                'name'       => $b->name,
                'limit'      => $b->amount,
                'spent'      => round((float) $expenses->where('category_id', $b->category_id)->sum('amount'), 2),
                'is_breached'=> (bool) $b->is_breached,
            ]);

        /** @var Goal[] $goalModels */
        $goalModels = Goal::where('user_id', $user->id)->where('status', 'active')->get();
        $goals = collect($goalModels)->map(fn(Goal $g) => [
            'name'     => $g->name,
            'target'   => $g->target_amount,
            'saved'    => $g->current_amount,
            'progress' => $g->progressPercent(),
        ]);

        $data = compact('user', 'monthLabel', 'month', 'expenses', 'income', 'totalExpenses', 'savings', 'byCategory', 'budgets', 'goals');

        $pdf = Pdf::loadView('exports.report', $data)
            ->setPaper('a4')
            ->setOptions(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false]);

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"finpilot_report_{$month}.pdf\"",
        ]);
    }

    public function taxSummaryPdf(Request $request): Response
    {
        $user = $request->user();
        $year = (int) $request->input('year', now()->year);

        // 80C: ELSS mutual funds + PPF + LIC etc. (investments tagged as 80C eligible)
        $investments80c = Investment::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereIn('type', ['mutual_fund', 'ppf', 'elss', 'nps', 'fd'])
            ->whereYear('started_at', $year)
            ->get()
            ->map(fn(Investment $inv) => [
                'name'   => $inv->name,
                'type'   => strtoupper($inv->type),
                'amount' => $inv->invested_amount,
            ]);

        $total80c    = min(150000, (float) $investments80c->sum('amount'));

        // Home loan interest (24b) — debts of type home_loan
        $homeLoanInterest = (float) Debt::where('user_id', $user->id)
            ->where('type', 'home_loan')
            ->where('status', 'active')
            ->sum('emi_amount') * 12 * 0.7; // rough interest portion estimate

        $homeLoanInterestCapped = min(200000, $homeLoanInterest);

        // HRA — from income sources tagged as salary with hra component
        $salaryIncome = (float) IncomeSource::where('user_id', $user->id)
            ->where('type', 'salary')
            ->where('is_active', true)
            ->sum('amount') * 12;

        // Savings bank interest (estimated at 3.5% on average balance, placeholder)
        $savingsBankInterest = 0.0;

        // Total deductions estimate
        $totalDeductions = $total80c + $homeLoanInterestCapped;
        $standardDeduction = 50000;
        $grossIncome = $salaryIncome;
        $taxableIncome = max(0, $grossIncome - $standardDeduction - $totalDeductions);

        // Old regime slab tax
        $tax = $this->computeSlabTax($taxableIncome);

        $data = compact(
            'user', 'year',
            'investments80c', 'total80c',
            'homeLoanInterest', 'homeLoanInterestCapped',
            'salaryIncome', 'savingsBankInterest',
            'standardDeduction', 'totalDeductions',
            'grossIncome', 'taxableIncome', 'tax'
        );

        $pdf = Pdf::loadView('exports.tax-summary', $data)
            ->setPaper('a4')
            ->setOptions(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false]);

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"finpilot_tax_{$year}.pdf\"",
        ]);
    }

    private function computeSlabTax(float $income): float
    {
        if ($income <= 250000) return 0;
        if ($income <= 500000) return ($income - 250000) * 0.05;
        if ($income <= 1000000) return 12500 + ($income - 500000) * 0.20;
        return 112500 + ($income - 1000000) * 0.30;
    }
}
