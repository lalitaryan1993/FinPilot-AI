<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DebtController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\GoalController;
use App\Http\Controllers\Api\V1\HealthScoreController;
use App\Http\Controllers\Api\V1\IncomeController;
use App\Http\Controllers\Api\V1\InvestmentController;
use App\Http\Controllers\Api\V1\AiSettingsController;
use App\Http\Controllers\Api\V1\AutomationRuleController;
use App\Http\Controllers\Api\V1\ExportController;
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\RecurringExpenseController;
use App\Http\Controllers\Api\V1\SmartImportController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\AI\ChatController;
use App\Http\Controllers\Api\V1\BankAccountController;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ============================================================
// PUBLIC ROUTES
// ============================================================
Route::prefix('v1')->group(function () {
    Route::post('/auth/register',   [RegisterController::class, 'store']);
    Route::post('/auth/login',      [LoginController::class, 'store']);
    Route::get('/currency/rates',   [CurrencyController::class, 'rates']);
});

// ============================================================
// PROTECTED ROUTES — require Sanctum token
// ============================================================
Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {

    // Auth
    Route::post('/auth/logout', [LoginController::class, 'destroy']);
    Route::get('/auth/me',      [LoginController::class, 'me']);
    Route::put('/auth/me', function (Request $request) {
        $validated = $request->validate([
            'name'                     => 'sometimes|string|max:255',
            'email'                    => 'sometimes|email|unique:users,email,' . $request->user()->id,
            'phone'                    => 'nullable|string|max:20',
            'currency'                 => 'sometimes|string|size:3',
            'timezone'                 => 'sometimes|string|max:50',
            'notification_preferences' => 'sometimes|array',
        ]);
        $request->user()->update($validated);
        return response()->json(['success' => true, 'data' => $request->user()->fresh()]);
    });

    // Categories
    Route::get('/categories', function (Request $request) {
        $q = Category::forUser($request->user()->id)
            ->orderBy('sort_order')
            ->orderBy('name');
        if ($request->type) {
            $q->where('type', $request->type);
        }
        return response()->json(['success' => true, 'data' => $q->get(['id','name','slug','icon','color','type','is_system'])]);
    });

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Income
    Route::apiResource('income-sources', IncomeController::class);
    Route::get('/income-sources/summary', [IncomeController::class, 'summary']);

    // Expenses
    Route::get('/expenses/trashed',              [ExpenseController::class, 'trashed']);
    Route::post('/expenses/{id}/restore',        [ExpenseController::class, 'restore'])->withTrashed();
    Route::get('/expenses/recurring',            [RecurringExpenseController::class, 'detect']);
    Route::get('/expenses/summary',              [ExpenseController::class, 'summary']);
    Route::get('/expenses/categories/breakdown', [ExpenseController::class, 'summary']);
    Route::apiResource('expenses', ExpenseController::class);

    // Budgets
    Route::get('/budgets/trashed', [BudgetController::class, 'trashed']);
    Route::post('/budgets/{id}/restore', [BudgetController::class, 'restore'])->withTrashed();
    Route::apiResource('budgets', BudgetController::class);
    Route::get('/budgets/status', [BudgetController::class, 'status']);

    // Goals
    Route::get('/goals/trashed', [GoalController::class, 'trashed']);
    Route::post('/goals/{id}/restore', [GoalController::class, 'restore'])->withTrashed();
    Route::apiResource('goals', GoalController::class);
    Route::post('/goals/{goal}/contribute', [GoalController::class, 'contribute']);

    // Debts
    Route::get('/debts/trashed', [DebtController::class, 'trashed']);
    Route::post('/debts/{id}/restore', [DebtController::class, 'restore'])->withTrashed();
    Route::apiResource('debts', DebtController::class);
    Route::get('/debts/emi-calendar', [DebtController::class, 'emiCalendar']);

    // Investments
    Route::get('/investments/portfolio', [InvestmentController::class, 'portfolio']);
    Route::get('/investments/trashed', [InvestmentController::class, 'trashed']);
    Route::post('/investments/{id}/restore', [InvestmentController::class, 'restore'])->withTrashed();
    Route::apiResource('investments', InvestmentController::class);

    // Income Sources
    Route::get('/income-sources/summary', [IncomeController::class, 'summary']);
    Route::get('/income-sources/trashed', [IncomeController::class, 'trashed']);
    Route::post('/income-sources/{id}/restore', [IncomeController::class, 'restore'])->withTrashed();
    Route::apiResource('income-sources', IncomeController::class);

    // Subscriptions
    Route::get('/subscriptions/summary', [SubscriptionController::class, 'summary']);
    Route::get('/subscriptions/trashed', [SubscriptionController::class, 'trashed']);
    Route::post('/subscriptions/{id}/restore', [SubscriptionController::class, 'restore'])->withTrashed();
    Route::apiResource('subscriptions', SubscriptionController::class);

    // Documents
    Route::get('/documents/trashed', [DocumentController::class, 'trashed']);
    Route::post('/documents/{id}/restore', [DocumentController::class, 'restore'])->withTrashed();
    Route::apiResource('documents', DocumentController::class)->only(['index', 'store', 'show', 'destroy']);

    // AI Settings (provider keys, agent config, defaults)
    Route::get('/ai-settings',               [AiSettingsController::class, 'index']);
    Route::post('/ai-settings',              [AiSettingsController::class, 'update']);
    Route::post('/ai-settings/test',         [AiSettingsController::class, 'testConnection']);

    // Smart Import (AI auto-extract)
    Route::get('/smart-imports',                                          [SmartImportController::class, 'index']);
    Route::post('/smart-imports',                                         [SmartImportController::class, 'store']);
    Route::get('/smart-imports/{id}',                                     [SmartImportController::class, 'show']);
    Route::get('/smart-imports/{id}/status',                              [SmartImportController::class, 'status']);
    Route::delete('/smart-imports/{id}',                                  [SmartImportController::class, 'destroy']);
    Route::post('/smart-imports/{importId}/confirm-all',                  [SmartImportController::class, 'confirmAll']);
    Route::post('/smart-imports/{importId}/items/{itemId}/confirm',       [SmartImportController::class, 'confirmItem']);
    Route::post('/smart-imports/{importId}/items/{itemId}/dismiss',       [SmartImportController::class, 'dismissItem']);

    // Health Score
    Route::get('/health-score',         [HealthScoreController::class, 'current']);
    Route::get('/health-score/history', [HealthScoreController::class, 'history']);

    // Family
    Route::prefix('family')->group(function () {
        Route::get('/',                        [FamilyController::class, 'show']);
        Route::post('/',                       [FamilyController::class, 'store']);
        Route::post('/join',                   [FamilyController::class, 'join']);
        Route::post('/leave',                  [FamilyController::class, 'leave']);
        Route::post('/regenerate-code',        [FamilyController::class, 'regenerateCode']);
        Route::get('/shared-expenses',                       [FamilyController::class, 'sharedExpenses']);
        Route::get('/shared-goals',                          [FamilyController::class, 'sharedGoals']);
        Route::post('/shared-goals',                         [FamilyController::class, 'storeSharedGoal']);
        Route::post('/shared-goals/{goalId}/contribute',     [FamilyController::class, 'contributeSharedGoal']);
        Route::get('/shared-budgets',                        [FamilyController::class, 'sharedBudgets']);
        Route::post('/shared-budgets',                       [FamilyController::class, 'storeSharedBudget']);
        Route::put('/members/{memberId}',                    [FamilyController::class, 'updateMember']);
        Route::delete('/members/{memberId}',                 [FamilyController::class, 'removeMember']);
    });

    // Export
    Route::prefix('export')->group(function () {
        Route::get('/expenses.csv',      [ExportController::class, 'expensesCsv']);
        Route::get('/report.pdf',        [ExportController::class, 'reportPdf']);
        Route::get('/tax-summary.pdf',   [ExportController::class, 'taxSummaryPdf']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/',              [NotificationController::class, 'index']);
        Route::post('/{id}/read',    [NotificationController::class, 'markRead']);
        Route::post('/read-all',     [NotificationController::class, 'markAllRead']);
        Route::delete('/{id}',       [NotificationController::class, 'destroy']);
    });

    // Automation Rules
    Route::apiResource('automation-rules', AutomationRuleController::class);
    Route::post('/automation-rules/{automationRule}/toggle', [AutomationRuleController::class, 'toggle']);

    // AI Chat
    Route::prefix('ai')->group(function () {
        Route::post('/chat',       [ChatController::class, 'store']);
        Route::post('/chat/stream',[ChatController::class, 'stream']);
    });

    // Bank accounts & money flow — static routes before wildcard {id} routes
    Route::get('/bank-accounts',                         [BankAccountController::class, 'index']);
    Route::post('/bank-accounts',                        [BankAccountController::class, 'store']);
    Route::post('/bank-accounts/import-statement',       [BankAccountController::class, 'importStatement']);
    Route::get('/money-flow',                            [BankAccountController::class, 'moneyFlow']);
    Route::put('/bank-accounts/{id}',                    [BankAccountController::class, 'update']);
    Route::delete('/bank-accounts/{id}',                 [BankAccountController::class, 'destroy']);
    Route::get('/bank-accounts/{id}/transactions',       [BankAccountController::class, 'transactions']);
    Route::post('/bank-accounts/{id}/transactions',      [BankAccountController::class, 'addTransaction']);
    // Single bank-transaction CRUD (static names, no account prefix)
    Route::get('/bank-transactions/{id}',                [BankAccountController::class, 'showTransaction']);
    Route::put('/bank-transactions/{id}',                [BankAccountController::class, 'updateTransaction']);
    Route::delete('/bank-transactions/{id}',             [BankAccountController::class, 'destroyTransaction']);
});
