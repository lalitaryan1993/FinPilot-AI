# FinPilot AI — Build Process Tracker

> **Project:** FinPilot AI (Open Source)
> **Tagline:** "Your Personal AI Financial Operating System"
> **Started:** 2026-05-30
> **Stack:** Laravel 13 + Laravel AI (official) + Inertia.js v3 + React 18 + TypeScript + Tailwind CSS v4 + Framer Motion

---

## Build Status

| Phase | Status | Details |
|-------|--------|---------|
| Phase 1: Foundation | ✅ Complete | Laravel 13 installed, all packages, MySQL DB created |
| Phase 2: Database & Models | ✅ Complete | 30 migrations, 20 Eloquent models, relationships |
| Phase 3: AI Framework | ✅ Complete | Laravel AI v0.7.2, 6 agents, 5 tools, Indian finance prompts |
| Phase 4: Backend API | ✅ Complete | 65+ API routes, controllers, events, Auth, AI streaming |
| Phase 5: Frontend Core | ✅ Complete | React 18, Dashboard, AI Chat, Login, layout, charts |
| Phase 6: Auth Fixes | ✅ Complete | Session auth, HandleInertiaRequests, z-index, dropdowns |
| Phase 7: Theme System | ✅ Complete | 6 base themes, 6 accents, density, sidebar style, persist |
| Phase 8: Sprint 2 Pages | ✅ Complete | Expenses, Budget, Goals, Debts, Register, Settings, Reports |
| Phase 9: Seeders & Docker | ✅ Complete | 25 categories + demo user, PHP 8.4 Docker Compose |
| Phase 10: Sprint 3 Pages | ✅ Complete | Investments, IncomeSources, Subscriptions, Documents, Family |
| Phase 11: Delete / Trash / Restore | ✅ Complete | Confirm modal + soft-delete trash sections across all 8 sections |
| Phase 12: Remaining Pages | ✅ Complete | Goals/Detail, Auth/Onboarding |
| Phase 13: AI Smart Import | ✅ Complete | Upload → Claude vision → review & confirm transactions |
| Phase 14: AI Settings | ✅ Complete | Provider key management, agent config, generation defaults |
| Phase 15: Sprint 5 Backend | ✅ Complete | FamilyController, HealthScoreController, ProcessDocumentOcrJob, SyncInvestmentNavJob, ExportController |
| Phase 16: Sprint 5 Frontend & Scheduling | ✅ Complete | Export buttons wired, artisan commands, cron scheduling |
| Phase 17: Sprint 6 — Notifications & Automation | ✅ Complete | DB notifications (4 types), NotificationController, TopBar bell wired, AutomationRuleController, EvaluateAutomationRulesJob, AutomationRules/Index.tsx |
| Phase 18: Sprint 6 — Tax Summary & PWA | ✅ Complete | Tax summary PDF (80C + Section 24b + slab tax), PWA manifest + service worker + Apple meta tags |
| Phase 19: Sprint 7 — Demo Data & Recurring | ✅ Complete | Comprehensive DemoUserSeeder (9 investments, 10 subs, 6 health scores, 120 expenses, 4 automation rules, 5 notifications), RecurringExpenseController, RecurringExpenses/Index.tsx |
| Phase 20: Sprint 7 — Multi-Currency | ✅ Complete | CurrencyController (rates), CurrencyContext + useCurrency hook, CurrencyProvider in AppLayout, CurrencyDisplay updated, 10-currency Settings picker |

---

## Installed Packages

### PHP (Composer)
| Package | Version | Purpose |
|---------|---------|---------|
| `laravel/framework` | v13.12.0 | Core framework |
| `laravel/ai` | v0.7.2 | Official AI SDK — 14 providers |
| `laravel/sanctum` | v4.3.2 | API token + session authentication |
| `laravel/reverb` | v1.10.2 | WebSocket server |
| `laravel/scout` | v11.2.0 | Full-text search |
| `laravel/telescope` | v5.20.0 | Debug assistant |
| `inertiajs/inertia-laravel` | v3.1.0 | Inertia SSR bridge |
| `tightenco/ziggy` | v2.6.2 | Named routes in JS |
| `spatie/laravel-permission` | v7.4.1 | Role-based access |
| `spatie/laravel-activitylog` | v4.12.3 | Audit logging |
| `barryvdh/laravel-dompdf` | v3.1.2 | PDF reports |
| `league/csv` | v9.28.0 | CSV import/export |
| `intervention/image` | v3.11.8 | Receipt image processing |

### JavaScript (npm)
| Package | Purpose |
|---------|---------|
| `@inertiajs/react` | Inertia React adapter |
| `react` + `react-dom` | UI framework |
| `typescript` | Type safety |
| `tailwindcss` v4 | Utility-first CSS |
| `framer-motion` | Animations |
| `recharts` | Financial charts |
| `zustand` | Global state |
| `@tanstack/react-query` | Server state / data fetching |
| `react-hook-form` + `zod` | Forms + validation |
| `lucide-react` | Icon library |
| `sonner` | Toast notifications |
| `date-fns` | Date formatting |
| `cmdk` | Command palette |

---

## AI Framework: Laravel AI (Official)

**Package:** `laravel/ai` v0.7.2
**Providers configured:** OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Ollama, OpenRouter, Azure, Bedrock, Cohere, xAI, ElevenLabs, VoyageAI, Jina

### Agents built
| Agent | File | Specialization |
|-------|------|----------------|
| `BudgetAgent` | `app/Ai/Agents/BudgetAgent.php` | Zero-based budgets, 50/30/20, Indian lifestyle |
| `SavingsAgent` | `app/Ai/Agents/SavingsAgent.php` | Spending analysis, 80C/NPS recommendations |
| `DebtAgent` | `app/Ai/Agents/DebtAgent.php` | Snowball/Avalanche, EMI, 24(b) tax deduction |
| `GoalAgent` | `app/Ai/Agents/GoalAgent.php` | SIP calculations, inflation-adjusted goals |
| `AnalyticsAgent` | `app/Ai/Agents/AnalyticsAgent.php` | Monthly reports, all-data analysis |
| `FraudDetectionAgent` | `app/Ai/Agents/FraudDetectionAgent.php` | Transaction anomaly detection |

### AI Tools (agents call these to get real user data)
| Tool | Returns |
|------|---------|
| `GetExpensesSummaryTool` | Monthly spending, category breakdown, trends |
| `GetBudgetStatusTool` | Budget utilization, breach alerts |
| `GetGoalProgressTool` | Goal progress, months to completion |
| `GetDebtSummaryTool` | Debt balances, EMI, debt-to-income ratio |
| `GetFinancialHealthTool` | Health score, grade, 5-dimension breakdown |

### AI Jobs
| Job | File | Purpose |
|-----|------|---------|
| `ProcessSmartImportJob` | `app/Jobs/ProcessSmartImportJob.php` | Sends image/PDF to Claude vision API; parses JSON transactions; creates SmartImportItem records |
| `ProcessDocumentOcrJob` | `app/Jobs/ProcessDocumentOcrJob.php` | Reads uploaded Documents, extracts transactions via Claude (vision for images, text for PDFs), auto-creates Expense/IncomeSource records, updates ocr_status |
| `CalculateHealthScoreJob` | `app/Jobs/CalculateHealthScoreJob.php` | Computes 5-dimension score (savings 30, debt 25, emergency 20, goals 15, budget 10), upserts to financial_health_scores; generates typed insights |
| `SyncInvestmentNavJob` | `app/Jobs/SyncInvestmentNavJob.php` | Syncs mutual fund NAV via AMFI mfapi.in (search by ISIN → fetch latest NAV); syncs stocks/ETFs via Yahoo Finance; updates current_price/current_value |

---

## Database: 30 Migrations ✅

```
users (extended)        categories (25 system)   income_sources
families                family_members           accounts
expenses (full-text)    budgets                  goals
goal_contributions      debts                    debt_payments
subscriptions           investments              documents
financial_health_scores automation_rules         ai_agent_conversations
activity_log            permissions              personal_access_tokens
cache                   jobs                     telescope_entries
smart_imports           smart_import_items       ai_settings
```

### Key new tables
| Table | Purpose |
|-------|---------|
| `smart_imports` | Tracks each uploaded file (status, AI notes, item counts) |
| `smart_import_items` | Individual extracted transactions (type, amount, description, confidence, status: pending/confirmed/dismissed) |
| `ai_settings` | Per-user encrypted AI provider keys + agent/default configuration |

---

## Models: 20 Eloquent Models ✅

```
User, Family, FamilyMember, Account, Category
Expense, Budget, Goal, GoalContribution
Debt, DebtPayment, Investment, IncomeSource
Subscription, Document, FinancialHealthScore
AutomationRule, SmartImport, SmartImportItem, AiSetting
```

---

## API Routes: 65+ Endpoints ✅

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PUT    /api/v1/auth/me
```

### Resources (CRUD + trashed/restore for all 8)
```
GET/POST/PUT/DELETE  /api/v1/expenses
GET                  /api/v1/expenses/trashed
POST                 /api/v1/expenses/{id}/restore
GET                  /api/v1/expenses/summary

GET/POST/PUT/DELETE  /api/v1/budgets
GET                  /api/v1/budgets/trashed
POST                 /api/v1/budgets/{id}/restore
GET                  /api/v1/budgets/status

GET/POST/PUT/DELETE  /api/v1/goals
GET                  /api/v1/goals/trashed
POST                 /api/v1/goals/{id}/restore
POST                 /api/v1/goals/{id}/contribute

GET/POST/PUT/DELETE  /api/v1/debts
GET                  /api/v1/debts/trashed
POST                 /api/v1/debts/{id}/restore
GET                  /api/v1/debts/emi-calendar

GET/POST/PUT/DELETE  /api/v1/investments
GET                  /api/v1/investments/trashed
POST                 /api/v1/investments/{id}/restore
GET                  /api/v1/investments/portfolio

GET/POST/PUT/DELETE  /api/v1/income-sources
GET                  /api/v1/income-sources/trashed
POST                 /api/v1/income-sources/{id}/restore
GET                  /api/v1/income-sources/summary

GET/POST/PUT/DELETE  /api/v1/subscriptions
GET                  /api/v1/subscriptions/trashed
POST                 /api/v1/subscriptions/{id}/restore
GET                  /api/v1/subscriptions/summary

GET/POST/DELETE      /api/v1/documents
GET                  /api/v1/documents/trashed
POST                 /api/v1/documents/{id}/restore
```

### Smart Import (AI auto-extract)
```
GET    /api/v1/smart-imports
POST   /api/v1/smart-imports                              (upload file → queue job)
GET    /api/v1/smart-imports/{id}
GET    /api/v1/smart-imports/{id}/status                  (poll while processing)
DELETE /api/v1/smart-imports/{id}
POST   /api/v1/smart-imports/{id}/confirm-all             (bulk confirm all pending)
POST   /api/v1/smart-imports/{importId}/items/{itemId}/confirm
POST   /api/v1/smart-imports/{importId}/items/{itemId}/dismiss
```

### AI Settings
```
GET    /api/v1/ai-settings                                (masked keys + non-key settings)
POST   /api/v1/ai-settings                                (bulk save)
POST   /api/v1/ai-settings/test                           (test connection for a provider)
```

### Health Score
```
GET    /api/v1/health-score                                (triggers job if not run today; returns latest score)
GET    /api/v1/health-score/history                        (last 12 months of scores)
```

### Family
```
GET    /api/v1/family                                      (current user's family + members + month stats)
POST   /api/v1/family                                      (create new family group)
POST   /api/v1/family/join                                 (join via 8-char invite code)
POST   /api/v1/family/leave                                (leave family; owner cannot leave)
POST   /api/v1/family/regenerate-code                      (owner only — new invite code)
GET    /api/v1/family/shared-expenses                      (family expenses for a month)
PUT    /api/v1/family/members/{memberId}                   (admin: update role/spending_limit/display_name)
DELETE /api/v1/family/members/{memberId}                   (admin/self remove)
```

### Export
```
GET    /api/v1/export/expenses.csv?month=YYYY-MM           (League/CSV download, all expenses for month)
GET    /api/v1/export/report.pdf?month=YYYY-MM             (DomPDF: stats + category breakdown + budgets + goals + transactions)
GET    /api/v1/export/tax-summary.pdf?year=YYYY            (DomPDF: income, 80C investments, Section 24b, slab tax computation)
```

### Notifications
```
GET    /api/v1/notifications                                (last 20 + unread count)
POST   /api/v1/notifications/read-all                      (mark all read)
POST   /api/v1/notifications/{id}/read                     (mark one read)
DELETE /api/v1/notifications/{id}                          (delete notification)
```

### Automation Rules
```
GET/POST/PUT/DELETE /api/v1/automation-rules               (CRUD with ownership check)
POST                /api/v1/automation-rules/{id}/toggle    (enable/disable)
```

### Recurring Expenses
```
GET    /api/v1/expenses/recurring                           (detect recurring patterns in last 6 months)
```

### Currency
```
GET    /api/v1/currency/rates                               (exchange rates vs INR; 10 currencies; public)
```

### Other
```
GET    /api/v1/categories
GET    /api/v1/dashboard
POST   /api/v1/ai/chat
POST   /api/v1/ai/chat/stream
```

---

## Web Routes: 28+ Routes ✅

```
GET /login            GET /register         GET /onboarding
GET /                 (Dashboard)
GET /expenses         GET /expenses/new     GET /expenses/{id}/edit   GET /expenses/{id}
GET /budget           GET /budget/new       GET /budget/{id}/edit
GET /goals            GET /goals/new        GET /goals/{id}/edit      GET /goals/{id}
GET /debts            GET /debts/new        GET /debts/{id}/edit
GET /investments      GET /investments/new  GET /investments/{id}/edit
GET /income           GET /income/new       GET /income/{id}/edit
GET /subscriptions    GET /subscriptions/new GET /subscriptions/{id}/edit
GET /documents        GET /documents/upload
GET /family           GET /reports          GET /ai               GET /ai/import
GET /settings         GET /settings/ai
GET /automations      GET /recurring-expenses
```

---

## Frontend Pages ✅

| Page | File | Status | Key Features |
|------|------|--------|--------------|
| Dashboard | `pages/Dashboard/Index.tsx` | ✅ | 6 widgets, health score, cash flow, AI insights |
| AI Chat | `pages/AI/Chat.tsx` | ✅ | SSE streaming, 5 agent contexts, starter prompts |
| **AI Smart Import** | `pages/AI/Import.tsx` | ✅ **NEW** | Drag & drop upload → Claude vision → review per-item/bulk confirm |
| Login | `pages/Auth/Login.tsx` | ✅ | Session auth, remember me |
| Register | `pages/Auth/Register.tsx` | ✅ | 4-step wizard (Account → Income → Goals → Prefs) |
| **Onboarding** | `pages/Auth/Onboarding.tsx` | ✅ **NEW** | 5-step post-register wizard → auto-creates budgets + first goal |
| Expenses Index | `pages/Expenses/Index.tsx` | ✅ | Table, filters, pagination, quick-add, delete modal, trash section, **Export CSV button wired** |
| Expenses Detail | `pages/Expenses/Detail.tsx` | ✅ | Full transaction detail, edit/delete |
| Expenses Create | `pages/Expenses/Create.tsx` | ✅ | Rich form with category, payment method, tags |
| Expenses Edit | `pages/Expenses/Edit.tsx` | ✅ | |
| Budget Index | `pages/Budget/Index.tsx` | ✅ | Radial progress cards, month nav, delete modal, trash section |
| Budget Create/Edit | `pages/Budget/Create.tsx` | ✅ | |
| Goals Index | `pages/Goals/Index.tsx` | ✅ | Goal cards, contribute modal, pause/resume, delete modal, trash section |
| **Goals Detail** | `pages/Goals/Detail.tsx` | ✅ **NEW** | Progress bar, stat grid, contribute modal, contribution history, pause/delete |
| Goals Create/Edit | `pages/Goals/Create.tsx` | ✅ | |
| Debts Index | `pages/Debts/Index.tsx` | ✅ | EMI calendar, payoff strategy, delete modal, trash section |
| Debts Create/Edit | `pages/Debts/Create.tsx` | ✅ | |
| Investments Index | `pages/Investments/Index.tsx` | ✅ | Portfolio donut, holdings table, SIP tracker, delete modal, trash section |
| Investments Create/Edit | `pages/Investments/Create.tsx` | ✅ | |
| Income Sources Index | `pages/IncomeSources/Index.tsx` | ✅ | Salary/freelance/rental, income mix bars, delete modal, trash section |
| Income Create/Edit | `pages/IncomeSources/Create.tsx` | ✅ | |
| Subscriptions Index | `pages/Subscriptions/Index.tsx` | ✅ | Renewal tracker, due-soon alerts, delete modal, trash section |
| Subscriptions Create/Edit | `pages/Subscriptions/Create.tsx` | ✅ | |
| Documents Index | `pages/Documents/Index.tsx` | ✅ | OCR status, transaction import count, delete modal, trash section |
| Documents Create | `pages/Documents/Create.tsx` | ✅ | Drag-drop upload |
| Family | `pages/Family/Index.tsx` | ✅ | Family group, invite code modal, member cards, spending limits |
| Reports | `pages/Reports/Index.tsx` | ✅ | Cash flow chart, category pie, budget bars, month navigator, **Export PDF button wired** |
| Settings | `pages/Settings/Index.tsx` | ✅ | Profile, 10-currency picker, 9 timezones, appearance, notifications, security, AI prefs |
| **AI Settings** | `pages/Settings/AI.tsx` | ✅ **NEW** | 3-tab: Providers (14 keys + test), Agents (6 configs), Defaults (temp/tokens/streaming) |
| **Automation Rules** | `pages/AutomationRules/Index.tsx` | ✅ **NEW** | 2-step create modal (trigger → action), rule cards with enable/disable toggle, fire_count badge |
| **Recurring Expenses** | `pages/RecurringExpenses/Index.tsx` | ✅ **NEW** | AI-detected patterns from 6-month history; frequency/confidence/annual-cost display; "Track as Subscription" CTA |

---

## UI Components ✅

### Layout
- `AppLayout` — ThemeProvider + **CurrencyProvider** wrapper + sidebar + topbar shell
- `Sidebar` — nav with active indicator; AI section: Ask FinPilot + Smart Import + **Automations**; main nav includes **Recurring** link; footer: Profile, AI Configuration, Sign out
- `TopBar` — **notification bell wired to real DB notifications** (poll 60s + on-open), user menu, theme palette button
- `ThemePanel` — slide-over with 6 base themes, 6 accents, density, live preview

### Currency System (Sprint 7)
- `CurrencyContext.tsx` — `CurrencyProvider` fetches `/api/v1/currency/rates` on mount; provides `convert()`, `fmt()`, `fmtCompact()` via `useCurrency()` hook
- `CurrencyDisplay.tsx` — updated to use `useCurrency()` — all monetary values in the app auto-convert when user changes currency in Settings
- Supports: INR, USD, EUR, GBP, JPY, AUD, CAD, SGD, AED, CHF (10 currencies)

### Shared UI
- `GlassCard` — glassmorphism base with glow variants
- **`DeleteConfirmModal`** — shared animated modal (Framer Motion); used across all 8 sections; shows item name, "Move to Trash" CTA, restore hint
- `CurrencyDisplay`, `HealthScoreCard`, `MetricCard`, `SkeletonLoader`
- `CashFlowChart`, `SpendingBreakdownChart`, `GoalsProgressCard`, `AIInsightsCarousel`

### Delete / Trash / Restore pattern (all 8 sections)
- **Trigger:** hover → Trash icon → `DeleteConfirmModal` opens (no direct delete)
- **Confirm:** `DELETE /api/v1/{resource}/{id}` → SoftDeletes → "moved to trash"
- **Trash section:** collapsible panel at bottom of each page, lazy-loaded (`enabled: open`)
- **Restore:** green Restore button → `POST /api/v1/{resource}/{id}/restore` → invalidates both query caches
- Applied to: Expenses, Budget, Goals, Debts, Investments, IncomeSources, Subscriptions, Documents

---

## AI Smart Import — Full Flow

```
User uploads PNG/JPG/WebP/PDF (max 20 MB)
        ↓
POST /api/v1/smart-imports
        ↓
SmartImportController::store()
  → stores file to local disk
  → creates SmartImport record (status: pending)
  → dispatches ProcessSmartImportJob
        ↓
ProcessSmartImportJob::handle()
  → images: encode base64 → Claude vision API (claude-opus-4-8)
  → PDFs: pdftotext fallback → Claude text API (claude-sonnet-4-6)
  → system prompt: Indian finance context, JSON schema enforcement
  → parses response: { source_type, notes, transactions[] }
  → creates SmartImportItem records (pending)
  → updates SmartImport status: done
        ↓
Frontend polls GET /api/v1/smart-imports/{id}/status every 3s
        ↓
UI shows ImportCard with expandable items:
  - Per-item: type badge, description, amount, date, category, confidence %
  - Actions: Edit (inline), Confirm ✓ (creates Expense/IncomeSource), Dismiss ✗
  - Bulk: "Confirm All" button (processes all pending)
        ↓
Confirmed items → Expense or IncomeSource records (source: 'ai_import')
```

---

## AI Settings — Architecture

```
GET /api/v1/ai-settings
  → reads ai_settings table (per-user)
  → merges .env fallbacks
  → masks API keys: first 8 chars + ••••••••
  → non-key values returned as-is

POST /api/v1/ai-settings { settings: {key: value} }
  → skips if value contains •••• (masked, unchanged)
  → API key fields (anthropic.api_key etc.) stored Crypt::encryptString()
  → other fields stored plain

POST /api/v1/ai-settings/test { provider: 'anthropic' }
  → fetches stored or env key
  → pings provider API (Anthropic messages, OpenAI models, Gemini models, Groq models)
  → returns { success, message }
```

**Stored setting keys:**
- `anthropic.api_key`, `openai.api_key`, `gemini.api_key`, `groq.api_key`, `deepseek.api_key`, `mistral.api_key`, `cohere.api_key`, `xai.api_key`, `openrouter.api_key`, `ollama.url`
- `agent.{budget|savings|debt|goal|analytics|fraud}.{enabled|provider|model}`
- `smart_import.provider`, `smart_import.model`
- `default.{chat|vision|fast|embeddings}`
- `gen.{temperature|max_tokens|streaming|india_context}`

---

## Artisan Commands ✅

| Command | Purpose |
|---------|---------|
| `php artisan finpilot:sync-nav` | Dispatches `SyncInvestmentNavJob` — fetches NAV for all active mutual funds (AMFI) and stock quotes (Yahoo Finance) |
| `php artisan finpilot:calculate-scores [--month=YYYY-MM]` | Dispatches `CalculateHealthScoreJob` for every user; defaults to current month |

### Scheduler (defined in `routes/console.php`)
| Schedule | Command | Notes |
|----------|---------|-------|
| Weekdays at 18:00 IST | `finpilot:sync-nav` | After Indian market close (NSE/BSE) |
| 1st of month at 01:00 IST | `finpilot:calculate-scores` | Monthly health score recalculation |

Run the Laravel scheduler via cron:
```cron
* * * * * cd /path/to/finpilot-ai && php artisan schedule:run >> /dev/null 2>&1
```

---

## Export Architecture ✅

### CSV Export (`GET /api/v1/export/expenses.csv?month=YYYY-MM`)
- Built with `League\Csv\Writer`
- Columns: Date, Description, Category, Amount (INR), Payment Mode, Merchant, Notes
- Filtered by month, ordered by expense_date
- Returns `Content-Disposition: attachment` response

### PDF Report (`GET /api/v1/export/report.pdf?month=YYYY-MM`)
- Built with `barryvdh/laravel-dompdf` + Blade view `resources/views/exports/report.blade.php`
- Sections: Summary stats (income / expenses / savings / savings rate), Category breakdown table, Budget status (on-track vs over-budget), Goal progress, Full transaction list
- Font: DejaVu Sans (PDF-safe, supports INR ₹ symbol)
- Paper: A4

---

## Docker Setup ✅

**PHP Version:** 8.4 (Alpine)
**Services:** app, horizon, reverb, scheduler, mysql:8.0, redis:7, meilisearch:1.6, ollama (optional)

```bash
docker compose up -d
docker exec finpilot_app php artisan migrate --seed

# App:         http://localhost:8000
# Telescope:   http://localhost:8000/telescope
# Horizon:     http://localhost:8000/horizon
```

---

## Demo Credentials ✅

```
Email:    demo@finpilot.ai
Password: demo1234
```

---

## Local Development (XAMPP)

```bash
php artisan serve --port=8000
npm run dev

# Add at least one AI key to .env:
ANTHROPIC_API_KEY=sk-ant-...   # best for Smart Import (vision)
GROQ_API_KEY=gsk_...           # fastest, free tier available

# Or manage keys via the UI:
# Settings → AI Configuration → API Keys tab
```

---

## Key Bug Fixes Applied

| Bug | Fix |
|-----|-----|
| `auth.user` undefined crash on login | Created `HandleInertiaRequests` middleware; registered in `bootstrap/app.php` web group |
| `verified` middleware blocking demo user | Removed from web routes; set `email_verified_at` on demo user |
| Login session not persisting | Added `session()->regenerate()` to LoginController; `credentials: 'include'` on fetch |
| Notification/user dropdown hidden behind dashboard cards | Added `relative z-30` to `<header>` |
| TypeScript `ease: number[]` type error | Cast to `[number, number, number, number]` in Framer Motion variants |
| `baseUrl` deprecation warning | Added `"ignoreDeprecations": "6.0"` to tsconfig.json |
| DebtController was empty stub | Fully implemented: CRUD + `emiCalendar()` with due-soon detection |
| Route ordering: `/expenses/trashed` shadowed by `{id}` | Placed all custom routes BEFORE `apiResource()` declarations |
| Direct delete without confirmation | Replaced all `window.confirm()` and row-state patterns with `DeleteConfirmModal` |
| Missing `useState` imports on Debts, IncomeSources | Added to import statement |

---

## Progress Log

| Date | Milestone |
|------|-----------|
| 2026-05-30 | Architecture design complete |
| 2026-05-30 | Laravel 13 + Laravel AI v0.7.2 installed |
| 2026-05-30 | 27 database migrations + 16 models complete |
| 2026-05-30 | 6 AI agents + 5 tools built with Indian finance prompts |
| 2026-05-30 | 35 API routes live and verified |
| 2026-05-30 | React dashboard, AI chat, auth pages complete |
| 2026-05-30 | 25 categories + demo user seeded |
| 2026-05-30 | Docker Compose with PHP 8.4 complete |
| 2026-05-30 | Auth bug fixed (session, HandleInertiaRequests, verified middleware) |
| 2026-05-30 | TopBar notification + user dropdowns implemented |
| 2026-05-30 | Theme system built (6 themes × 6 accents, persisted to localStorage) |
| 2026-05-30 | Sprint 2: Expenses, Budget, Goals, Debts, Register, Settings, Reports pages |
| 2026-05-30 | DebtController fully implemented with EMI calendar |
| 2026-05-30 | All TypeScript errors resolved, clean build |
| 2026-05-30 | Sprint 3: Investments, IncomeSources, Subscriptions, Documents, Family pages |
| 2026-05-30 | 55+ API routes, Sidebar updated, all Create/Edit pages built |
| 2026-05-30 | Expenses/Detail "Show Details" button added |
| 2026-05-30 | Phase 11: DeleteConfirmModal + trash/restore for all 8 sections (16 new API endpoints) |
| 2026-05-30 | Phase 12: Goals/Detail.tsx + Auth/Onboarding.tsx (5-step wizard) |
| 2026-05-30 | Phase 13: AI Smart Import — ProcessSmartImportJob + SmartImportController + AI/Import.tsx |
| 2026-05-30 | Phase 14: AI Settings — AiSettingsController + Settings/AI.tsx (14 providers, 6 agents, defaults) |
| 2026-05-30 | 30 migrations, 20 models, 65+ API routes, 28+ frontend pages |
| 2026-05-31 | Phase 15: HealthScoreController (current + history), FamilyController routes wired to api.php |
| 2026-05-31 | Phase 15: ProcessDocumentOcrJob — AI extracts transactions from Documents section, auto-creates Expense/IncomeSource records |
| 2026-05-31 | Phase 15: SyncInvestmentNavJob — AMFI mfapi.in for mutual funds, Yahoo Finance for stocks/ETFs |
| 2026-05-31 | Phase 15: ExportController — expenses CSV (League/CSV) + monthly PDF report (DomPDF Blade) |
| 2026-05-31 | Phase 16: Export PDF button wired in Reports page; Export CSV button added to Expenses page |
| 2026-05-31 | Phase 16: Artisan commands finpilot:sync-nav + finpilot:calculate-scores; cron scheduling in routes/console.php |
| 2026-05-31 | Sprint 5 complete — all 7 planned items delivered; 80+ API routes, 4 queued jobs, 2 artisan commands |
| 2026-06-01 | Phase 17: Sprint 6 — 4 DB notification classes, NotificationController, TopBar bell fully wired to real data |
| 2026-06-01 | Phase 17: Sprint 6 — AutomationRuleController + EvaluateAutomationRulesJob + AutomationRules/Index.tsx |
| 2026-06-01 | Phase 18: Sprint 6 — Tax summary PDF (80C/Section 24b/slab tax); tax-summary.blade.php Blade view |
| 2026-06-01 | Phase 18: Sprint 6 — PWA support: manifest.json, service worker (sw.js), Apple meta tags in app.blade.php |
| 2026-06-01 | Phase 19: Sprint 7 — Fixed automation_rules enum mismatch (VARCHAR migration); DemoUserSeeder rewritten with 9 investments, 10 subscriptions, 8 budgets, 6 health scores, 120 expenses (6 months), 4 automation rules, 5 notifications, 24 goal contributions, 19 debt payments |
| 2026-06-01 | Phase 19: Sprint 7 — RecurringExpenseController (fuzzy description matching, frequency detection, confidence scoring); RecurringExpenses/Index.tsx with filter tabs and "Track as Subscription" CTA |
| 2026-06-01 | Phase 20: Sprint 7 — CurrencyController (10 currencies vs INR); CurrencyContext + useCurrency hook; CurrencyProvider in AppLayout; CurrencyDisplay updated — all monetary values auto-convert |

---

## Sprint 5 — ✅ Complete (2026-05-31)

| Item | Delivered |
|------|-----------|
| Goals/Index → Detail navigation | ✅ Eye icon button → `/goals/{id}` |
| AI Chat: Analytics + Fraud agents | ✅ AnalyticsAgent + FraudDetectionAgent wired |
| FamilyController (create/join/members/remove) | ✅ 8 endpoints, invite code, role/spending limit management |
| CalculateHealthScoreJob + HealthScoreController | ✅ 5-dimension scoring; `current()` + `history()` endpoints |
| ProcessDocumentOcrJob | ✅ AI extracts transactions from Documents; auto-creates Expense/IncomeSource records |
| SyncInvestmentNavJob | ✅ AMFI API for mutual funds; Yahoo Finance for stocks/ETFs |
| ExportController + UI buttons | ✅ CSV (League/CSV) + PDF (DomPDF); buttons in Expenses and Reports pages |
| Artisan commands + scheduling | ✅ `finpilot:sync-nav`, `finpilot:calculate-scores`; cron via `routes/console.php` |

---

## Sprint 6 — ✅ Complete (2026-06-01)

| Item | Delivered |
|------|-----------|
| In-app notifications (real data) | ✅ 4 notification classes stored in DB; NotificationController (index/read/markAll/delete); TopBar bell polls every 60s + on-open; click navigates to linked page |
| Automation Rules | ✅ AutomationRuleController (CRUD + toggle); EvaluateAutomationRulesJob dispatched on every new expense; AutomationRules/Index.tsx with 2-step create modal and rule cards |
| Tax Summary PDF | ✅ `GET /api/v1/export/tax-summary.pdf?year=YYYY`; income + 80C investments (ELSS/MF/PPF) + Section 24b + slab tax computation; Blade view with dark summary box |
| PWA Support | ✅ `public/manifest.json` (8 icon sizes, 3 shortcuts); `public/sw.js` (cache-first static, network-first HTML); Apple meta tags + SW registration in `app.blade.php` |

---

## Sprint 7 — ✅ Complete (2026-06-01)

| Item | Delivered |
|------|-----------|
| Comprehensive demo data | ✅ DemoUserSeeder: 3 income sources, 5 goals, 3 debts, 120 expenses (6 months), 8 budgets (overall + 7 category), 9 investments, 10 subscriptions, 6 health scores, 4 automation rules, 5 notifications, 24 goal contributions, 19 debt payments |
| automation_rules enum fix | ✅ New migration changes ENUM to VARCHAR to match controller validation values |
| Recurring expense detection | ✅ `GET /api/v1/expenses/recurring` — fuzzy description normalisation, frequency detection (weekly/monthly/quarterly/annually), confidence scoring (0–100), annual cost projection; RecurringExpenses/Index.tsx with filter tabs, expandable rows, "Track as Subscription" CTA |
| Multi-currency support | ✅ `GET /api/v1/currency/rates` — 10 currencies vs INR; CurrencyContext + useCurrency hook; CurrencyProvider wraps AppLayout; CurrencyDisplay uses context — all amounts auto-convert; Settings shows 10-currency picker |

---

## Next Sprint Priorities (Sprint 8)

1. **PWA icons** — generate real PNG icon files at 72/96/128/144/152/192/384/512px for `public/icons/` so the PWA is actually installable
2. **Smart Import: PDF-to-image fallback** — convert PDF pages to images using GD/Imagick for better Claude vision accuracy on scanned bank statements
3. **Recurring expense auto-categorisation** — when a recurring expense is detected, suggest the best subscription category and auto-fill subscription create form
4. **Budget alerts via push** — integrate browser Push API (Web Push / VAPID) for real-time budget breach notifications
5. **Investment XIRR calculator** — compute Extended Internal Rate of Return across all SIP contributions and current portfolio value
6. **AI expense classification improvements** — if a manually added expense description matches a recurring pattern, auto-suggest the correct category
7. **Public demo mode** — read-only Inertia middleware that blocks writes; demo banner UI; shareable link for showcasing the app
