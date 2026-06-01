export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    currency: string;
    locale: string;
    timezone: string;
    avatar_path?: string;
    onboarding_step: number;
    family_id?: number;
    is_active: boolean;
    notification_preferences?: Record<string, boolean>;
    ai_preferences?: Record<string, string>;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    type: 'expense' | 'income' | 'transfer';
    is_system: boolean;
    sort_order: number;
}

export interface IncomeSource {
    id: number;
    user_id: number;
    name: string;
    type: 'salary' | 'freelance' | 'rental' | 'dividends' | 'business' | 'pension' | 'side_hustle' | 'other';
    amount: number;
    currency: string;
    frequency: 'one_time' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
    expected_day?: number;
    is_active: boolean;
}

export interface Expense {
    id: number;
    user_id: number;
    category_id: number;
    category?: Category;
    description: string;
    amount: number;
    base_amount: number;
    currency: string;
    expense_date: string;
    payment_method?: string;
    merchant?: string;
    notes?: string;
    tags?: string[];
    receipt_path?: string;
    source: string;
    created_at: string;
}

export interface Budget {
    id: number;
    user_id: number;
    category_id?: number;
    category?: Category;
    name: string;
    amount: number;
    spent_amount: number;
    period: string;
    period_start: string;
    period_end: string;
    alert_at_percent: number;
    is_active: boolean;
    // computed
    remaining?: number;
    percent_used?: number;
    is_breached?: boolean;
    is_near_limit?: boolean;
}

export interface Goal {
    id: number;
    user_id: number;
    name: string;
    type: string;
    target_amount: number;
    current_amount: number;
    monthly_target?: number;
    target_date?: string;
    priority: number;
    icon?: string;
    color?: string;
    status: 'active' | 'paused' | 'completed' | 'abandoned';
    // computed
    progress_percent?: number;
    remaining_amount?: number;
}

export interface Debt {
    id: number;
    user_id: number;
    name: string;
    type: string;
    lender?: string;
    principal_amount: number;
    current_balance: number;
    interest_rate: number;
    emi_amount?: number;
    emi_due_day?: number;
    tenure_months?: number;
    strategy: string;
    status: 'active' | 'closed' | 'defaulted';
}

export interface FinancialHealthScore {
    total_score: number;
    grade: string;
    color: string;
    scores: {
        savings: number;
        debt: number;
        emergency: number;
        goals: number;
        budget: number;
    };
}

export interface DashboardData {
    overview: {
        monthly_income: number;
        monthly_expenses: number;
        monthly_savings: number;
        savings_rate: number;
        expense_change_pct: number;
        currency: string;
    };
    health_score: FinancialHealthScore | null;
    cash_flow: Array<{
        month: string;
        income: number;
        expenses: number;
        savings: number;
    }>;
    category_breakdown: Array<{
        category: Category;
        amount: number;
        count: number;
    }>;
    goals: Goal[];
    upcoming_emis: Array<{
        id: number;
        name: string;
        lender: string;
        emi_amount: number;
        emi_due_day: number;
    }>;
    ai_insights: Array<{
        title: string;
        body: string;
        type: string;
    }>;
    month: string;
}

export interface Investment {
    id: number;
    user_id: number;
    name: string;
    type: 'mutual_fund' | 'stock' | 'fd' | 'rd' | 'ppf' | 'epf' | 'nps' | 'gold' | 'real_estate' | 'crypto' | 'bonds' | 'other';
    symbol?: string;
    isin?: string;
    units?: number;
    buy_price?: number;
    current_price?: number;
    invested_amount: number;
    current_value?: number;
    is_sip: boolean;
    sip_amount?: number;
    sip_day?: number;
    started_at?: string;
    maturity_at?: string;
    status: 'active' | 'paused' | 'redeemed';
    price_updated_at?: string;
    // computed
    gain_loss?: number;
    gain_loss_percent?: number;
}

export interface Subscription {
    id: number;
    user_id: number;
    name: string;
    provider?: string;
    category: 'entertainment' | 'productivity' | 'health' | 'finance' | 'education' | 'shopping' | 'cloud' | 'other';
    amount: number;
    currency: string;
    billing_cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    next_billing_date: string;
    started_at?: string;
    is_active: boolean;
    auto_detected: boolean;
    usage_score?: number;
    cancel_url?: string;
    // computed
    annual_cost?: number;
    monthly_cost?: number;
    days_until_bill?: number;
    is_due_soon?: boolean;
}

export interface Document {
    id: number;
    user_id: number;
    name: string;
    type: 'bank_statement' | 'credit_card_statement' | 'salary_slip' | 'receipt' | 'invoice' | 'investment_statement' | 'tax_document' | 'other';
    file_path: string;
    file_size?: number;
    mime_type?: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
    extracted_data?: Record<string, unknown>;
    transactions_imported: number;
    period_from?: string;
    period_to?: string;
    processed_at?: string;
    created_at: string;
    // computed
    file_size_human?: string;
    is_processed?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export interface PageProps {
    auth: { user: User };
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}
