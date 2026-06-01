<?php

namespace Database\Seeders;

use App\Models\AutomationRule;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Debt;
use App\Models\Expense;
use App\Models\FinancialHealthScore;
use App\Models\Goal;
use App\Models\IncomeSource;
use App\Models\Investment;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'demo@finpilot.ai'],
            [
                'name'              => 'Arjun Sharma',
                'password'          => Hash::make('demo1234'),
                'email_verified_at' => now(),
                'currency'          => 'INR',
                'locale'            => 'en_IN',
                'timezone'          => 'Asia/Kolkata',
                'onboarding_step'   => 4,
                'is_active'         => true,
            ]
        );

        $this->seedIncome($user->id);
        $goals = $this->seedGoals($user->id);
        $this->seedGoalContributions($user->id, $goals);
        $debts = $this->seedDebts($user->id);
        $this->seedDebtPayments($user->id, $debts);

        $categories = Category::where('is_system', true)->pluck('id', 'slug');
        $this->seedCurrentMonthExpenses($user->id, $categories);
        $this->seedHistoricalExpenses($user->id, $categories);
        $this->seedBudgets($user->id, $categories);
        $this->seedInvestments($user->id);
        $this->seedSubscriptions($user->id);
        $this->seedHealthScores($user->id);
        $this->seedAutomationRules($user->id);
        $this->seedNotifications($user->id);

        $this->command->info('Demo user ready: demo@finpilot.ai / demo1234');
    }

    // ─────────────────────────────────────────────────────────────
    // INCOME
    // ─────────────────────────────────────────────────────────────
    private function seedIncome(int $uid): void
    {
        $sources = [
            ['name' => 'Monthly Salary',          'type' => 'salary',    'amount' => 85000, 'frequency' => 'monthly', 'expected_day' => 1,  'tax_category' => 'salaried'],
            ['name' => 'Freelance Design Work',   'type' => 'freelance', 'amount' => 15000, 'frequency' => 'monthly', 'expected_day' => 25, 'tax_category' => 'self_employed'],
            ['name' => 'Rental Income – Pune Flat','type' => 'rental',   'amount' => 12000, 'frequency' => 'monthly', 'expected_day' => 3,  'tax_category' => 'other'],
        ];
        foreach ($sources as $src) {
            IncomeSource::updateOrCreate(
                ['user_id' => $uid, 'name' => $src['name']],
                array_merge($src, ['user_id' => $uid, 'currency' => 'INR', 'is_active' => true])
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GOALS
    // ─────────────────────────────────────────────────────────────
    private function seedGoals(int $uid): array
    {
        $defs = [
            'emergency' => ['name' => 'Emergency Fund',                'type' => 'emergency_fund', 'target' => 300000,  'current' => 185000, 'monthly' => 10000, 'months' => null, 'priority' => 1, 'icon' => 'shield',       'color' => '#10B981'],
            'car'       => ['name' => 'New Car — Honda City',          'type' => 'car',            'target' => 800000,  'current' => 120000, 'monthly' => 15000, 'months' => 45,   'priority' => 2, 'icon' => 'car',          'color' => '#3B82F6'],
            'vacation'  => ['name' => 'Goa Vacation',                  'type' => 'vacation',       'target' => 80000,   'current' => 32000,  'monthly' => 8000,  'months' => 6,    'priority' => 3, 'icon' => 'plane',        'color' => '#F5C842'],
            'home'      => ['name' => 'Second Property Down Payment',   'type' => 'home',           'target' => 1500000, 'current' => 200000, 'monthly' => 25000, 'months' => 48,   'priority' => 4, 'icon' => 'home',         'color' => '#8B5CF6'],
            'education' => ['name' => 'MBA Abroad Fund',               'type' => 'education',      'target' => 2500000, 'current' => 75000,  'monthly' => 20000, 'months' => 72,   'priority' => 5, 'icon' => 'book-open',    'color' => '#06B6D4'],
        ];

        $goals = [];
        foreach ($defs as $key => $d) {
            $goals[$key] = Goal::updateOrCreate(
                ['user_id' => $uid, 'name' => $d['name']],
                [
                    'user_id'        => $uid,
                    'type'           => $d['type'],
                    'target_amount'  => $d['target'],
                    'current_amount' => $d['current'],
                    'monthly_target' => $d['monthly'],
                    'target_date'    => $d['months'] ? now()->addMonths($d['months'])->toDateString() : null,
                    'priority'       => $d['priority'],
                    'status'         => 'active',
                    'icon'           => $d['icon'],
                    'color'          => $d['color'],
                ]
            );
        }
        return $goals;
    }

    // ─────────────────────────────────────────────────────────────
    // GOAL CONTRIBUTIONS
    // ─────────────────────────────────────────────────────────────
    private function seedGoalContributions(int $uid, array $goals): void
    {
        if (DB::table('goal_contributions')->where('user_id', $uid)->count() > 0) return;

        $rows = [];
        for ($i = 5; $i >= 0; $i--) {
            $base = now()->subMonths($i)->startOfMonth()->addDays(4);
            $rows[] = ['goal_id' => $goals['emergency']->id, 'user_id' => $uid, 'amount' => 10000, 'note' => 'Monthly SIP to emergency fund',  'contributed_at' => $base->toDateString(), 'created_at' => now(), 'updated_at' => now()];
            $rows[] = ['goal_id' => $goals['car']->id,       'user_id' => $uid, 'amount' => 15000, 'note' => 'Car savings — monthly transfer',  'contributed_at' => $base->toDateString(), 'created_at' => now(), 'updated_at' => now()];
            $rows[] = ['goal_id' => $goals['vacation']->id,  'user_id' => $uid, 'amount' => 8000,  'note' => 'Goa trip fund',                   'contributed_at' => $base->toDateString(), 'created_at' => now(), 'updated_at' => now()];
            if ($i < 4) {
                $rows[] = ['goal_id' => $goals['home']->id,      'user_id' => $uid, 'amount' => 25000, 'note' => 'Property down payment savings',  'contributed_at' => $base->toDateString(), 'created_at' => now(), 'updated_at' => now()];
            }
            if ($i < 2) {
                $rows[] = ['goal_id' => $goals['education']->id,  'user_id' => $uid, 'amount' => 20000, 'note' => 'MBA fund contribution',           'contributed_at' => $base->toDateString(), 'created_at' => now(), 'updated_at' => now()];
            }
        }
        DB::table('goal_contributions')->insert($rows);
    }

    // ─────────────────────────────────────────────────────────────
    // DEBTS
    // ─────────────────────────────────────────────────────────────
    private function seedDebts(int $uid): array
    {
        $homeLoan = Debt::updateOrCreate(
            ['user_id' => $uid, 'name' => 'Home Loan — HDFC Bank'],
            ['user_id' => $uid, 'type' => 'home_loan', 'lender' => 'HDFC Bank', 'principal_amount' => 4500000, 'current_balance' => 3850000, 'interest_rate' => 8.75, 'emi_amount' => 39000, 'emi_due_day' => 5,  'tenure_months' => 240, 'strategy' => 'none',      'status' => 'active']
        );
        $personalLoan = Debt::updateOrCreate(
            ['user_id' => $uid, 'name' => 'Personal Loan — ICICI Bank'],
            ['user_id' => $uid, 'type' => 'personal_loan', 'lender' => 'ICICI Bank', 'principal_amount' => 300000, 'current_balance' => 185000, 'interest_rate' => 14.5, 'emi_amount' => 8500, 'emi_due_day' => 10, 'tenure_months' => 36,  'strategy' => 'avalanche', 'status' => 'active']
        );
        $carLoan = Debt::updateOrCreate(
            ['user_id' => $uid, 'name' => 'Car Loan — SBI (Old Maruti)'],
            ['user_id' => $uid, 'type' => 'car_loan', 'lender' => 'State Bank of India', 'principal_amount' => 450000, 'current_balance' => 58000, 'interest_rate' => 9.25, 'emi_amount' => 9200, 'emi_due_day' => 15, 'tenure_months' => 60, 'strategy' => 'snowball', 'status' => 'active']
        );
        return compact('homeLoan', 'personalLoan', 'carLoan');
    }

    // ─────────────────────────────────────────────────────────────
    // DEBT PAYMENTS
    // ─────────────────────────────────────────────────────────────
    private function seedDebtPayments(int $uid, array $debts): void
    {
        if (DB::table('debt_payments')->where('user_id', $uid)->count() > 0) return;

        $rows = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i)->startOfMonth();
            $rows[] = ['debt_id' => $debts['homeLoan']->id,     'user_id' => $uid, 'amount' => 39000, 'principal_component' => 10200, 'interest_component' => 28800, 'type' => 'emi',        'paid_at' => $month->copy()->addDays(4)->toDateString(),  'reference_number' => 'HDFC'  . rand(100000, 999999), 'notes' => null, 'created_at' => now(), 'updated_at' => now()];
            $rows[] = ['debt_id' => $debts['personalLoan']->id, 'user_id' => $uid, 'amount' => 8500,  'principal_component' => 4000,  'interest_component' => 4500,  'type' => 'emi',        'paid_at' => $month->copy()->addDays(9)->toDateString(),  'reference_number' => 'ICICI' . rand(100000, 999999), 'notes' => null, 'created_at' => now(), 'updated_at' => now()];
            $rows[] = ['debt_id' => $debts['carLoan']->id,      'user_id' => $uid, 'amount' => 9200,  'principal_component' => 7300,  'interest_component' => 1900,  'type' => 'emi',        'paid_at' => $month->copy()->addDays(14)->toDateString(), 'reference_number' => 'SBI'   . rand(100000, 999999), 'notes' => null, 'created_at' => now(), 'updated_at' => now()];
        }
        // Extra prepayment on personal loan 3 months ago
        $rows[] = ['debt_id' => $debts['personalLoan']->id, 'user_id' => $uid, 'amount' => 20000, 'principal_component' => 20000, 'interest_component' => 0, 'type' => 'prepayment', 'paid_at' => now()->subMonths(3)->startOfMonth()->addDays(20)->toDateString(), 'reference_number' => 'PREPAY' . rand(100000, 999999), 'notes' => 'Bonus prepayment to reduce tenor', 'created_at' => now(), 'updated_at' => now()];

        DB::table('debt_payments')->insert($rows);
    }

    // ─────────────────────────────────────────────────────────────
    // CURRENT MONTH EXPENSES
    // ─────────────────────────────────────────────────────────────
    private function seedCurrentMonthExpenses(int $uid, $cats): void
    {
        $data = [
            ['Swiggy – Chicken Biryani',      'dining-out',    650,   1],
            ['DMart Monthly Groceries',        'groceries',     3200,  2],
            ['HDFC Home Loan EMI',             'emi-loans',     39000, 5],
            ['ICICI Personal Loan EMI',        'emi-loans',     8500,  10],
            ['SBI Car Loan EMI',               'emi-loans',     9200,  15],
            ['Reliance Smart – Weekly Basket', 'groceries',     1800,  6],
            ['Ola Cabs – Office Commute',      'transport',     480,   7],
            ['Netflix Premium',                'subscriptions', 649,   7],
            ['Apollo Pharmacy',                'healthcare',    850,   8],
            ['Petrol – HP Pump',               'transport',     2200,  10],
            ['Zomato – Margherita Pizza',      'dining-out',    520,   11],
            ['Jio Recharge 5G',                'utilities',     299,   1],
            ['Amazon – Running Shoes',         'shopping',      1999,  14],
            ['MSEB Electricity Bill',          'utilities',     1800,  15],
            ['BigBasket Weekly Shop',          'groceries',     2400,  16],
            ['Rapido Auto Ride',               'transport',     85,    17],
            ['Lakme Salon – Haircut',          'personal-care', 450,   19],
            ['Zepto Quick Essentials',         'groceries',     850,   20],
            ['Cafe Coffee Day',                'dining-out',    320,   21],
            ['BSNL Broadband',                 'utilities',     699,   22],
            ['Myntra – Summer Kurta',          'shopping',      899,   23],
            ['Spotify Premium',                'subscriptions', 119,   7],
        ];

        $base = now()->startOfMonth();
        foreach ($data as [$desc, $slug, $amt, $day]) {
            $catId = $cats[$slug] ?? $cats['miscellaneous'] ?? null;
            if (!$catId) continue;
            Expense::firstOrCreate(
                ['user_id' => $uid, 'description' => $desc, 'expense_date' => $base->copy()->addDays($day - 1)->toDateString()],
                ['category_id' => $catId, 'amount' => $amt, 'base_amount' => $amt, 'currency' => 'INR', 'payment_method' => 'upi', 'source' => 'manual']
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HISTORICAL EXPENSES (months 1–5 back)
    // ─────────────────────────────────────────────────────────────
    private function seedHistoricalExpenses(int $uid, $cats): void
    {
        // [desc, category-slug, amount, day-of-month]
        $monthly = [
            1 => [
                ['HDFC Home Loan EMI',          'emi-loans',     39000, 5],
                ['ICICI Personal Loan EMI',      'emi-loans',     8500,  10],
                ['SBI Car Loan EMI',             'emi-loans',     9200,  15],
                ['DMart Monthly Groceries',      'groceries',     4200,  3],
                ['BigBasket Weekly',             'groceries',     2800,  12],
                ['Swiggy – Multiple Orders',     'dining-out',    1840,  8],
                ['Zomato Weekend Special',       'dining-out',    760,   20],
                ['Metro Card Recharge',          'transport',     500,   2],
                ['Petrol – HP Pump',             'transport',     2100,  15],
                ['Jio Recharge',                 'utilities',     299,   1],
                ['MSEB Electricity Bill',        'utilities',     1920,  18],
                ['Netflix Premium',              'subscriptions', 649,   7],
                ['Spotify',                      'subscriptions', 119,   7],
                ['Gym Membership – Cult.fit',    'personal-care', 1200,  1],
                ['Doctor Consultation – Practo', 'healthcare',    600,   22],
                ['Flipkart – Mixer Grinder',     'shopping',      2499,  14],
            ],
            2 => [
                ['HDFC Home Loan EMI',           'emi-loans',     39000, 5],
                ['ICICI Personal Loan EMI',      'emi-loans',     8500,  10],
                ['SBI Car Loan EMI',             'emi-loans',     9200,  15],
                ['Zepto Groceries',              'groceries',     3600,  4],
                ['Nature Basket Organic',        'groceries',     1900,  16],
                ['Barbeque Nation Dinner',        'dining-out',    2400,  10],
                ['Swiggy – Office Lunch',        'dining-out',    1200,  18],
                ['Ola Cabs – Monthly',           'transport',     2800,  12],
                ['HP Petrol Station',            'transport',     2000,  22],
                ['Jio Recharge',                 'utilities',     299,   1],
                ['Water Bill – Municipal',       'utilities',     450,   5],
                ['MSEB Electricity Bill',        'utilities',     1650,  17],
                ['Amazon Prime (Annual)',         'subscriptions', 1499,  8],
                ['Salon – Hair Color & Trim',    'personal-care', 1800,  14],
                ['Apollo Pharmacy',              'healthcare',    1200,  25],
                ['Amazon – Programming Books',   'shopping',      1350,  20],
                ['Gift – Friend Birthday',       'gifts-charity', 1500,  26],
            ],
            3 => [
                ['HDFC Home Loan EMI',           'emi-loans',     39000, 5],
                ['ICICI Personal Loan EMI',      'emi-loans',     8500,  10],
                ['SBI Car Loan EMI',             'emi-loans',     9200,  15],
                ['DMart Big Monthly Shop',       'groceries',     5200,  2],
                ['Swiggy Instamart',             'groceries',     1400,  18],
                ['Restaurants & Cafes',          'dining-out',    3100,  15],
                ['Blinkit Quick Delivery',       'groceries',     750,   25],
                ['Uber Eats',                    'dining-out',    680,   22],
                ['Petrol & Parking',             'transport',     3500,  10],
                ['Auto & Metro Card',            'transport',     800,   20],
                ['Jio Recharge',                 'utilities',     299,   1],
                ['MSEB Electricity Bill',        'utilities',     2100,  16],
                ['Gas Bill – Mahanagar Gas',     'utilities',     520,   8],
                ['Netflix',                      'subscriptions', 649,   7],
                ['Gym + Spa – Monthly',          'personal-care', 2200,  3],
                ['Max Hospital Health Checkup',  'healthcare',    2500,  24],
                ['Myntra – Ethnic Wear',         'shopping',      3200,  19],
                ['Coursera – React Course',      'education',     2500,  12],
                ['ICICI Personal Loan Prepay',   'emi-loans',     20000, 20],
            ],
            4 => [
                ['HDFC Home Loan EMI',           'emi-loans',     39000, 5],
                ['ICICI Personal Loan EMI',      'emi-loans',     8500,  10],
                ['SBI Car Loan EMI',             'emi-loans',     9200,  15],
                ['BigBasket Monthly Order',      'groceries',     3800,  5],
                ['Local Vegetable Market',       'groceries',     900,   20],
                ['Dine Out – Anniversary Dinner','dining-out',    1800,  7],
                ['Swiggy – Multiple',            'dining-out',    1100,  14],
                ['Ola Cabs – Office',            'transport',     2200,  9],
                ['Petrol HP Pump',               'transport',     1900,  18],
                ['Jio + BSNL Bills',             'utilities',     1000,  3],
                ['MSEB Electricity Bill',        'utilities',     1780,  15],
                ['Netflix',                      'subscriptions', 649,   7],
                ['Spotify',                      'subscriptions', 119,   7],
                ['Salon – Grooming',             'personal-care', 650,   10],
                ['Vitamin D & B12 Supplements',  'healthcare',    800,   5],
                ['Flipkart Big Sale',            'shopping',      4200,  22],
                ['LIC Premium',                  'insurance',     5500,  10],
            ],
            5 => [
                ['HDFC Home Loan EMI',           'emi-loans',     39000, 5],
                ['ICICI Personal Loan EMI',      'emi-loans',     8500,  10],
                ['SBI Car Loan EMI',             'emi-loans',     9200,  15],
                ['DMart + Zepto Groceries',      'groceries',     4100,  4],
                ['Fresh Vegetable Market',       'groceries',     600,   15],
                ['Restaurants & Dine Out',       'dining-out',    2600,  12],
                ['Pizza Hut Family Night',       'dining-out',    1400,  24],
                ['Ola + Metro Transport',        'transport',     2900,  8],
                ['Jio Recharge',                 'utilities',     299,   1],
                ['MSEB Electricity + Water Bill','utilities',     2200,  14],
                ['Netflix',                      'subscriptions', 649,   7],
                ['Google One Storage',           'subscriptions', 130,   12],
                ['Gym Membership',               'personal-care', 1200,  1],
                ['Chemist – Monthly Medicines',  'healthcare',    450,   18],
                ['LIC Term Insurance',           'insurance',     5500,  10],
                ['NGO Donation – CRY',           'gifts-charity', 2000,  25],
                ['Zara – Formal Shirt',          'shopping',      2799,  19],
            ],
        ];

        foreach ($monthly as $offset => $rows) {
            $monthStart = now()->subMonths($offset)->startOfMonth();
            foreach ($rows as [$desc, $slug, $amt, $day]) {
                $catId = $cats[$slug] ?? $cats['miscellaneous'] ?? null;
                if (!$catId) continue;
                Expense::firstOrCreate(
                    ['user_id' => $uid, 'description' => $desc, 'expense_date' => $monthStart->copy()->addDays($day - 1)->toDateString()],
                    ['category_id' => $catId, 'amount' => $amt, 'base_amount' => $amt, 'currency' => 'INR', 'payment_method' => 'upi', 'source' => 'manual']
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // BUDGETS
    // ─────────────────────────────────────────────────────────────
    private function seedBudgets(int $uid, $cats): void
    {
        $start = now()->startOfMonth()->toDateString();
        $end   = now()->endOfMonth()->toDateString();

        Budget::updateOrCreate(
            ['user_id' => $uid, 'name' => 'Overall Monthly Budget', 'period_start' => $start],
            ['amount' => 80000, 'spent_amount' => 67960, 'period' => 'monthly', 'period_end' => $end, 'is_active' => true, 'alert_at_percent' => 80]
        );

        $catBudgets = [
            ['Groceries',    'groceries',     8000,  8250,  85],
            ['Dining Out',   'dining-out',    4000,  1490,  80],
            ['Transport',    'transport',     5000,  2765,  80],
            ['Shopping',     'shopping',      5000,  2898,  80],
            ['Utilities',    'utilities',     5000,  2798,  80],
            ['Healthcare',   'healthcare',    3000,  850,   80],
            ['Entertainment','entertainment', 2500,  649,   80],
            ['EMI / Loans',  'emi-loans',     57000, 56700, 95],
        ];

        foreach ($catBudgets as [$name, $slug, $budget, $spent, $alert]) {
            $catId = $cats[$slug] ?? null;
            Budget::updateOrCreate(
                ['user_id' => $uid, 'name' => $name . ' Budget', 'period_start' => $start],
                ['category_id' => $catId, 'amount' => $budget, 'spent_amount' => $spent, 'period' => 'monthly', 'period_end' => $end, 'is_active' => true, 'alert_at_percent' => $alert]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // INVESTMENTS
    // ─────────────────────────────────────────────────────────────
    private function seedInvestments(int $uid): void
    {
        $investments = [
            ['name' => 'HDFC Flexi Cap Fund – Direct Growth',    'type' => 'mutual_fund', 'isin' => 'INF179K01BB1', 'symbol' => null,       'units' => 248.75,  'buy_price' => 200.99,  'current_price' => 214.35, 'invested_amount' => 50000,  'current_value' => 53350,  'is_sip' => true,  'sip_amount' => 5000,  'sip_day' => 5,  'started_at' => now()->subMonths(10), 'maturity_at' => null],
            ['name' => 'Axis Bluechip Fund – Direct Growth',     'type' => 'mutual_fund', 'isin' => 'INF846K01EW2', 'symbol' => null,       'units' => 118.42,  'buy_price' => 253.34,  'current_price' => 271.22, 'invested_amount' => 30000,  'current_value' => 32100,  'is_sip' => true,  'sip_amount' => 3000,  'sip_day' => 10, 'started_at' => now()->subMonths(10), 'maturity_at' => null],
            ['name' => 'Mirae Asset ELSS Tax Saver – Direct',    'type' => 'mutual_fund', 'isin' => 'INF769K01107', 'symbol' => null,       'units' => 185.30,  'buy_price' => 80.94,   'current_price' => 96.45,  'invested_amount' => 50000,  'current_value' => 59600,  'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(24), 'maturity_at' => null],
            ['name' => 'Nippon India ETF Nifty 50 BeES',         'type' => 'stock',       'isin' => 'INF204KB15I2', 'symbol' => 'NIFTYBEES','units' => 250,     'buy_price' => 210,     'current_price' => 231.50, 'invested_amount' => 52500,  'current_value' => 57875,  'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(8),  'maturity_at' => null],
            ['name' => 'Reliance Industries Ltd',                'type' => 'stock',       'isin' => null,           'symbol' => 'RELIANCE', 'units' => 20,      'buy_price' => 2385,    'current_price' => 2610,   'invested_amount' => 47700,  'current_value' => 52200,  'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(14), 'maturity_at' => null],
            ['name' => 'HDFC Bank Ltd',                          'type' => 'stock',       'isin' => null,           'symbol' => 'HDFCBANK', 'units' => 50,      'buy_price' => 1450,    'current_price' => 1575,   'invested_amount' => 72500,  'current_value' => 78750,  'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(18), 'maturity_at' => null],
            ['name' => 'SBI Fixed Deposit @ 7.2% p.a.',         'type' => 'fd',          'isin' => null,           'symbol' => null,       'units' => null,    'buy_price' => null,    'current_price' => null,   'invested_amount' => 200000, 'current_value' => 214400, 'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(12), 'maturity_at' => now()->addMonths(12)],
            ['name' => 'PPF Account – SBI Branch',               'type' => 'ppf',         'isin' => null,           'symbol' => null,       'units' => null,    'buy_price' => null,    'current_price' => null,   'invested_amount' => 150000, 'current_value' => 163200, 'is_sip' => true,  'sip_amount' => 12500, 'sip_day' => 1,  'started_at' => now()->subYears(3),   'maturity_at' => now()->addYears(12)],
            ['name' => 'Digital Gold – Paytm Money',             'type' => 'gold',        'isin' => null,           'symbol' => 'GOLD',     'units' => 12.5,    'buy_price' => 5800,    'current_price' => 7200,   'invested_amount' => 72500,  'current_value' => 90000,  'is_sip' => false, 'sip_amount' => null,  'sip_day' => null,'started_at' => now()->subMonths(20), 'maturity_at' => null],
        ];

        foreach ($investments as $inv) {
            Investment::updateOrCreate(
                ['user_id' => $uid, 'name' => $inv['name']],
                [
                    'user_id'          => $uid,
                    'type'             => $inv['type'],
                    'isin'             => $inv['isin'],
                    'symbol'           => $inv['symbol'],
                    'units'            => $inv['units'],
                    'buy_price'        => $inv['buy_price'],
                    'current_price'    => $inv['current_price'],
                    'invested_amount'  => $inv['invested_amount'],
                    'current_value'    => $inv['current_value'],
                    'is_sip'           => $inv['is_sip'],
                    'sip_amount'       => $inv['sip_amount'],
                    'sip_day'          => $inv['sip_day'],
                    'started_at'       => $inv['started_at'],
                    'maturity_at'      => $inv['maturity_at'],
                    'status'           => 'active',
                    'price_updated_at' => now()->subHours(2),
                ]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SUBSCRIPTIONS
    // ─────────────────────────────────────────────────────────────
    private function seedSubscriptions(int $uid): void
    {
        // [name, provider, category, amount, billing_cycle, next_billing_date, started_at, usage_score]
        $subs = [
            ['Netflix Premium 4K',       'Netflix',   'entertainment', 649,   'monthly',  now()->addDays(7),   now()->subMonths(10), 9],
            ['Amazon Prime',             'Amazon',    'entertainment', 1499,  'annually', now()->addMonths(2), now()->subMonths(8),  8],
            ['Disney+ Hotstar Premium',  'Hotstar',   'entertainment', 899,   'annually', now()->addMonths(5), now()->subMonths(4),  7],
            ['Spotify Premium',          'Spotify',   'entertainment', 119,   'monthly',  now()->addDays(7),   now()->subMonths(12), 9],
            ['Google One 100GB',         'Google',    'cloud',         130,   'monthly',  now()->addDays(12),  now()->subMonths(6),  7],
            ['Swiggy One Membership',    'Swiggy',    'other',         299,   'monthly',  now()->addDays(14),  now()->subMonths(3),  6],
            ['Zerodha Kite Plus',        'Zerodha',   'finance',       2000,  'annually', now()->addMonths(9), now()->subMonths(3),  8],
            ['Coursera Plus',            'Coursera',  'education',     5760,  'annually', now()->addMonths(7), now()->subMonths(5),  5],
            ['iCloud+ 50GB',             'Apple',     'cloud',         75,    'monthly',  now()->addDays(20),  now()->subMonths(15), 8],
            ['LinkedIn Premium Career',  'LinkedIn',  'productivity',  2599,  'monthly',  now()->addDays(3),   now()->subMonths(2),  4],
        ];

        foreach ($subs as [$name, $provider, $cat, $amount, $cycle, $nextBilling, $startedAt, $usage]) {
            Subscription::updateOrCreate(
                ['user_id' => $uid, 'name' => $name],
                [
                    'user_id'           => $uid,
                    'provider'          => $provider,
                    'category'          => $cat,
                    'amount'            => $amount,
                    'currency'          => 'INR',
                    'billing_cycle'     => $cycle,
                    'next_billing_date' => $nextBilling->toDateString(),
                    'started_at'        => $startedAt->toDateString(),
                    'is_active'         => true,
                    'usage_score'       => $usage,
                ]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HEALTH SCORES (6 months)
    // ─────────────────────────────────────────────────────────────
    private function seedHealthScores(int $uid): void
    {
        // [month_offset, total, savings, debt, emergency, goal, budget, savings_rate, debt_ratio, emergency_months]
        $scores = [
            [5, 62, 65, 45, 58, 70, 72, 0.320, 0.480, 3.8, ['Emergency fund below 4-month target', 'High debt-to-income ratio — consider prepayment strategy', 'Savings rate can be improved by 5%']],
            [4, 65, 68, 48, 61, 72, 73, 0.340, 0.460, 4.1, ['Good progress on emergency fund', 'Budget adherence improving', 'Consider ELSS investments for 80C tax saving']],
            [3, 68, 70, 51, 65, 73, 74, 0.360, 0.440, 4.5, ['Emergency fund growing steadily — 4.5 months covered', 'Personal loan prepayment reduced balance by ₹20k', 'Investment portfolio up 6.2%']],
            [2, 71, 72, 54, 68, 75, 78, 0.380, 0.430, 4.9, ['Excellent budget control this month', 'Debt ratio improving month-on-month', 'Goal contributions consistent']],
            [1, 73, 74, 56, 71, 77, 79, 0.390, 0.410, 5.3, ['Strong savings discipline maintained', 'Emergency fund nearing 5.5-month target', 'PPF contribution on track for 80C']],
            [0, 75, 76, 58, 74, 79, 80, 0.400, 0.400, 5.7, ['Financial health trending upward — Good grade!', 'Emergency fund 61.7% complete', 'Investment portfolio XIRR: 14.2%', 'Consider increasing SIP by ₹2,000']],
        ];

        foreach ($scores as [$offset, $total, $sav, $debt, $emer, $goal, $budget, $savRate, $debtRatio, $emerMonths, $insights]) {
            $month = now()->subMonths($offset)->startOfMonth()->toDateString();
            try {
                FinancialHealthScore::updateOrCreate(
                    ['user_id' => $uid, 'score_month' => $month],
                    [
                        'user_id'          => $uid,
                        'total_score'      => $total,
                        'savings_score'    => $sav,
                        'debt_score'       => $debt,
                        'emergency_score'  => $emer,
                        'goal_score'       => $goal,
                        'budget_score'     => $budget,
                        'savings_rate'     => $savRate,
                        'debt_ratio'       => $debtRatio,
                        'emergency_months' => $emerMonths,
                        'insights'         => $insights,
                        'calculated_at'    => now()->subMonths($offset)->startOfMonth()->addDay(),
                    ]
                );
            } catch (\Throwable $e) {
                $this->command->warn("Health score for offset -{$offset} skipped: " . $e->getMessage());
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // AUTOMATION RULES
    // ─────────────────────────────────────────────────────────────
    private function seedAutomationRules(int $uid): void
    {
        $rules = [
            [
                'name'           => 'Large Transaction Alert',
                'description'    => 'Get notified when any single expense exceeds ₹5,000',
                'trigger_type'   => 'expense_amount',
                'trigger_config' => ['operator' => '>=', 'threshold' => 5000],
                'action_type'    => 'notify',
                'action_config'  => ['message' => 'Large transaction detected: {{description}} – ₹{{amount}}'],
                'is_active'      => true,
                'fire_count'     => 8,
            ],
            [
                'name'           => 'Dining Budget Breach Alert',
                'description'    => 'Notify when dining-out spending exceeds ₹4,000 per month',
                'trigger_type'   => 'budget_breach',
                'trigger_config' => ['budget_category' => 'dining-out', 'threshold' => 4000],
                'action_type'    => 'notify',
                'action_config'  => ['message' => 'Dining Out budget has been exceeded this month!'],
                'is_active'      => true,
                'fire_count'     => 2,
            ],
            [
                'name'           => 'Emergency Fund 75% Milestone',
                'description'    => 'Celebrate when emergency fund reaches 75% of target',
                'trigger_type'   => 'goal_milestone',
                'trigger_config' => ['milestone_percent' => 75],
                'action_type'    => 'notify',
                'action_config'  => ['message' => '🎉 Emergency Fund is 75% complete! Almost there!'],
                'is_active'      => true,
                'fire_count'     => 0,
            ],
            [
                'name'           => 'High Grocery Expense',
                'description'    => 'Flag when any single grocery purchase exceeds ₹3,000',
                'trigger_type'   => 'expense_amount',
                'trigger_config' => ['operator' => '>', 'threshold' => 3000, 'category_slug' => 'groceries'],
                'action_type'    => 'notify',
                'action_config'  => ['message' => 'High grocery expense: ₹{{amount}} recorded'],
                'is_active'      => false,
                'fire_count'     => 3,
            ],
        ];

        foreach ($rules as $rule) {
            AutomationRule::updateOrCreate(
                ['user_id' => $uid, 'name' => $rule['name']],
                array_merge($rule, ['user_id' => $uid])
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────
    private function seedNotifications(int $uid): void
    {
        if (DB::table('notifications')->where('notifiable_id', $uid)->count() > 0) return;

        $rows = [
            [
                'id'              => (string) Str::uuid(),
                'type'            => 'App\Notifications\BudgetBreachedNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id'   => $uid,
                'data'            => json_encode(['type' => 'warning', 'icon' => 'alert-triangle', 'title' => 'Groceries budget exceeded', 'body' => 'Your Groceries Budget is ₹250 over the ₹8,000 limit this month.', 'link' => '/budget', 'meta' => ['spent' => 8250, 'budget_amount' => 8000]]),
                'read_at'         => null,
                'created_at'      => now()->subHours(3),
                'updated_at'      => now()->subHours(3),
            ],
            [
                'id'              => (string) Str::uuid(),
                'type'            => 'App\Notifications\LargeTransactionNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id'   => $uid,
                'data'            => json_encode(['type' => 'alert', 'icon' => 'credit-card', 'title' => 'Large transaction recorded', 'body' => 'HDFC Home Loan EMI of ₹39,000 was logged today.', 'link' => '/expenses', 'meta' => ['amount' => 39000]]),
                'read_at'         => now()->subHours(1),
                'created_at'      => now()->subDays(3),
                'updated_at'      => now()->subDays(3),
            ],
            [
                'id'              => (string) Str::uuid(),
                'type'            => 'App\Notifications\GoalMilestoneNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id'   => $uid,
                'data'            => json_encode(['type' => 'success', 'icon' => 'target', 'title' => 'Emergency Fund 60% reached!', 'body' => 'Your Emergency Fund is now 61.7% complete. Keep it up!', 'link' => '/goals', 'meta' => ['percent' => 61.7, 'goal_name' => 'Emergency Fund']]),
                'read_at'         => now()->subMinutes(30),
                'created_at'      => now()->subDays(5),
                'updated_at'      => now()->subDays(5),
            ],
            [
                'id'              => (string) Str::uuid(),
                'type'            => 'App\Notifications\AutomationRuleFiredNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id'   => $uid,
                'data'            => json_encode(['type' => 'info', 'icon' => 'zap', 'title' => 'Automation rule triggered', 'body' => '"Large Transaction Alert" fired: Amazon – Running Shoes ₹1,999', 'link' => '/automations', 'meta' => []]),
                'read_at'         => null,
                'created_at'      => now()->subDays(14),
                'updated_at'      => now()->subDays(14),
            ],
            [
                'id'              => (string) Str::uuid(),
                'type'            => 'App\Notifications\LargeTransactionNotification',
                'notifiable_type' => 'App\Models\User',
                'notifiable_id'   => $uid,
                'data'            => json_encode(['type' => 'info', 'icon' => 'trending-up', 'title' => 'Investment portfolio up 8.4%', 'body' => 'Your total portfolio value is ₹5,49,175 — ₹42,675 gain this quarter.', 'link' => '/investments', 'meta' => ['gain_percent' => 8.4]]),
                'read_at'         => null,
                'created_at'      => now()->subDays(7),
                'updated_at'      => now()->subDays(7),
            ],
        ];

        DB::table('notifications')->insert($rows);
    }
}
