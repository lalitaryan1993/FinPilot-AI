<?php

use App\Jobs\CalculateHealthScoreJob;
use App\Jobs\SyncInvestmentNavJob;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── finpilot:sync-nav ────────────────────────────────────────────────
// Fetches latest NAV prices for mutual funds and stocks via AMFI / Yahoo Finance.
Artisan::command('finpilot:sync-nav', function () {
    $this->info('[FinPilot] Dispatching SyncInvestmentNavJob…');
    SyncInvestmentNavJob::dispatch();
    $this->info('[FinPilot] Job dispatched.');
})->purpose('Sync mutual fund NAV prices and stock quotes for all active investments');

// ── finpilot:calculate-scores ────────────────────────────────────────
// Runs CalculateHealthScoreJob for every active user for the current month.
Artisan::command('finpilot:calculate-scores {--month= : Month in Y-m format, defaults to current month}', function () {
    $monthStr = $this->option('month');
    $month    = $monthStr
        ? \Carbon\Carbon::createFromFormat('Y-m', $monthStr)->startOfMonth()
        : now()->startOfMonth();

    $users = User::whereNull('deleted_at')->get(['id', 'name']);

    $this->info("[FinPilot] Calculating health scores for {$users->count()} users ({$month->format('F Y')})…");

    $users->each(function (User $user) use ($month) {
        CalculateHealthScoreJob::dispatch($user, $month->copy());
    });

    $this->info('[FinPilot] All jobs dispatched.');
})->purpose('Calculate financial health scores for all users');

// ── Scheduling ───────────────────────────────────────────────────────
// Sync NAV prices every weekday at 6 PM IST (12:30 UTC) after market close.
Schedule::command('finpilot:sync-nav')->weekdays()->at('18:00')->timezone('Asia/Kolkata');

// Calculate health scores on the 1st of every month at 1 AM IST.
Schedule::command('finpilot:calculate-scores')->monthlyOn(1, '01:00')->timezone('Asia/Kolkata');
