<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ============================================================
// AUTH ROUTES — unauthenticated only
// ============================================================
Route::middleware('guest')->group(function () {
    Route::get('/login',    fn() => Inertia::render('Auth/Login'))->name('login');
    Route::get('/register', fn() => Inertia::render('Auth/Register'))->name('register');
});

// ============================================================
// AUTHENTICATED ROUTES — full SPA shell
// ============================================================
Route::post('/logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/login');
})->middleware('auth:sanctum')->name('logout');

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/onboarding', fn() => Inertia::render('Auth/Onboarding'))->name('onboarding');

    // Dashboard
    Route::get('/', fn() => Inertia::render('Dashboard/Index'))->name('dashboard');

    // Expenses
    Route::get('/expenses',              fn() => Inertia::render('Expenses/Index'))->name('expenses');
    Route::get('/expenses/new',          fn() => Inertia::render('Expenses/Create'))->name('expenses.create');
    Route::get('/expenses/{id}/edit',    fn(int $id) => Inertia::render('Expenses/Edit',   ['id' => $id]))->name('expenses.edit');
    Route::get('/expenses/{id}',         fn(int $id) => Inertia::render('Expenses/Detail', ['id' => $id]))->name('expenses.show');

    // Budget
    Route::get('/budget',           fn() => Inertia::render('Budget/Index'))->name('budget');
    Route::get('/budget/new',       fn() => Inertia::render('Budget/Create'))->name('budget.create');
    Route::get('/budget/{id}/edit', fn(int $id) => Inertia::render('Budget/Edit', ['id' => $id]))->name('budget.edit');

    // Goals
    Route::get('/goals',            fn() => Inertia::render('Goals/Index'))->name('goals');
    Route::get('/goals/new',        fn() => Inertia::render('Goals/Create'))->name('goals.create');
    Route::get('/goals/{id}/edit',  fn(int $id) => Inertia::render('Goals/Edit', ['id' => $id]))->name('goals.edit');
    Route::get('/goals/{id}',       fn(int $id) => Inertia::render('Goals/Detail', ['id' => $id]))->name('goals.detail');

    // Debts
    Route::get('/debts',            fn() => Inertia::render('Debts/Index'))->name('debts');
    Route::get('/debts/new',        fn() => Inertia::render('Debts/Create'))->name('debts.create');
    Route::get('/debts/{id}/edit',  fn(int $id) => Inertia::render('Debts/Edit', ['id' => $id]))->name('debts.edit');

    // Investments
    Route::get('/investments',            fn() => Inertia::render('Investments/Index'))->name('investments');
    Route::get('/investments/new',        fn() => Inertia::render('Investments/Create'))->name('investments.create');
    Route::get('/investments/{id}/edit',  fn(int $id) => Inertia::render('Investments/Edit', ['id' => $id]))->name('investments.edit');

    // Income Sources
    Route::get('/income',           fn() => Inertia::render('IncomeSources/Index'))->name('income');
    Route::get('/income/new',       fn() => Inertia::render('IncomeSources/Create'))->name('income.create');
    Route::get('/income/{id}/edit', fn(int $id) => Inertia::render('IncomeSources/Edit', ['id' => $id]))->name('income.edit');

    // Subscriptions
    Route::get('/subscriptions',            fn() => Inertia::render('Subscriptions/Index'))->name('subscriptions');
    Route::get('/subscriptions/new',        fn() => Inertia::render('Subscriptions/Create'))->name('subscriptions.create');
    Route::get('/subscriptions/{id}/edit',  fn(int $id) => Inertia::render('Subscriptions/Edit', ['id' => $id]))->name('subscriptions.edit');

    // Documents
    Route::get('/documents',        fn() => Inertia::render('Documents/Index'))->name('documents');
    Route::get('/documents/upload', fn() => Inertia::render('Documents/Create'))->name('documents.create');

    // Other pages
    Route::get('/family',     fn() => Inertia::render('Family/Index'))->name('family');
    Route::get('/reports',    fn() => Inertia::render('Reports/Index'))->name('reports');
    Route::get('/ai',         fn() => Inertia::render('AI/Chat'))->name('ai.chat');
    Route::get('/ai/import',  fn() => Inertia::render('AI/Import'))->name('ai.import');
    Route::get('/settings',    fn() => Inertia::render('Settings/Index'))->name('settings');
    Route::get('/settings/ai', fn() => Inertia::render('Settings/AI'))->name('settings.ai');
    Route::get('/automations',          fn() => Inertia::render('AutomationRules/Index'))->name('automations');
    Route::get('/recurring-expenses',   fn() => Inertia::render('RecurringExpenses/Index'))->name('recurring-expenses');
    Route::get('/money-flow',      fn() => Inertia::render('MoneyFlow/Index'))->name('money-flow');
    Route::get('/notifications',   fn() => Inertia::render('Notifications/Index'))->name('notifications');
});
