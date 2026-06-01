# FinPilot AI — Personal Finance OS

> A full-featured, AI-powered personal finance dashboard built with Laravel 13, Inertia.js, React 19, and TypeScript. Manage expenses, income, budgets, investments, bank accounts, and more — all in one dark-themed, responsive interface.

---

## Features

### Core Finance Modules

| Module | Highlights |
|---|---|
| **Dashboard** | Health score, net worth, spending overview, quick stats |
| **Expenses** | CRUD, category icons, spending chart, amount range filter, payment method filter, bulk delete, card/table view |
| **Income Sources** | Multiple types (salary, freelance, rental, etc.), income mix chart, pause/resume toggle |
| **Budget** | Radial progress rings, over-budget alerts banner, period tracking (monthly/weekly/custom) |
| **Goals** | Savings targets, contribution history, progress visualization |
| **Debts & EMIs** | EMI calendar, payment tracking, debt-free date estimate |
| **Investments** | Portfolio allocation donut chart, XIRR calculator (per investment), SIP tracking |
| **Subscriptions** | Recurring subscription management, billing cycle tracking |
| **Recurring Expenses** | Auto-detection of repeating expense patterns |
| **Documents** | Upload and manage financial documents |
| **Family** | Shared expenses, family member management, invite codes |
| **Reports** | CSV export, PDF tax summary, visual reports |

### Money Flow (Bank Accounts)

- Add and manage multiple bank accounts (Savings, Current, Credit Card, Wallet, FD)
- Manual transaction entry with credit/debit toggle
- **AI-powered statement import** — upload a bank statement image/PDF or paste SMS text; AI extracts all transactions automatically
- Edit and delete individual bank transactions (balance auto-corrected)
- Combined statement view — unified timeline of bank transactions + expenses with date grouping, credit/debit filter, date range presets

### AI Features

- **Smart Import** — Upload UPI screenshots, bank statements, receipts, salary slips; AI extracts transactions for review and confirm
- **Multi-provider AI** — Anthropic Claude, OpenAI GPT-4o, Google Gemini (configurable per user in Settings)
- **Anthropic native PDF support** — PDFs sent directly to Claude via document API (no text stripping)
- **AI Chat** — Ask FinPilot questions about your finances
- **Automation Rules** — Rule-based transaction categorisation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.3+, Laravel 13 |
| Frontend | React 19, TypeScript, Inertia.js v3 |
| Styling | Tailwind CSS v4, Framer Motion |
| Data fetching | TanStack Query v5 |
| Charts | Recharts |
| Auth | Laravel Sanctum |
| Database | SQLite (dev) / MySQL (Docker / prod) |
| Cache & Queue | Database (dev) / Redis (Docker / prod) |
| AI Providers | Anthropic Claude, OpenAI, Google Gemini |
| Build tool | Vite 8 |

---

## Requirements

- PHP 8.3+
- Composer 2
- Node.js 20+ and npm
- SQLite (zero-config for local dev) **or** MySQL 8 (Docker / production)
- At least one AI API key (Anthropic, OpenAI, or Gemini) — can also be added per-user inside the app

---

## Local Setup (php artisan serve)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/finpilot-ai.git
cd finpilot-ai

composer install
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```env
APP_NAME="FinPilot AI"
APP_URL=http://localhost:8000

# SQLite — no extra server needed
DB_CONNECTION=sqlite

# AI keys — add at least one (users can also set their own in Settings)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
GEMINI_API_KEY=AIxxxxxxxx
```

### 3. Migrate and seed

```bash
touch database/database.sqlite

php artisan migrate --seed
```

### 4. Build frontend

```bash
# Production build
npm run build

# OR development with hot-reload (run in a second terminal)
npm run dev
```

### 5. Start the server

```bash
php artisan serve
```

Open **http://localhost:8000**, register an account, and you're ready.

---

## Docker Setup (MySQL + Redis)

### 1. Clone and copy env

```bash
git clone https://github.com/YOUR_USERNAME/finpilot-ai.git
cd finpilot-ai
cp .env.example .env
```

### 2. Configure `.env` for Docker

```env
APP_KEY=                    # generated in step 4
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=finpilot
DB_USERNAME=finpilot
DB_PASSWORD=secret

REDIS_HOST=redis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
GEMINI_API_KEY=AIxxxxxxxx
```

### 3. Start containers

```bash
docker compose up -d --build
```

### 4. Initialise the app

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

Visit **http://localhost:8000**

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `APP_KEY` | Laravel encryption key (run `php artisan key:generate`) | — |
| `APP_URL` | Public URL | `http://localhost` |
| `DB_CONNECTION` | `sqlite` or `mysql` | `sqlite` |
| `DB_HOST` | MySQL host | `127.0.0.1` |
| `DB_DATABASE` | Database name | `laravel` |
| `DB_USERNAME` | Database user | `root` |
| `DB_PASSWORD` | Database password | — |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `CACHE_STORE` | `database` or `redis` | `database` |
| `SESSION_DRIVER` | `database` or `redis` | `database` |
| `QUEUE_CONNECTION` | `database` or `redis` | `database` |

> AI keys are **optional at setup time**. Each user can add their own provider keys in **Settings → AI Configuration** inside the app.

---

## Project Structure

```
finpilot-ai/
├── app/
│   ├── Http/Controllers/Api/V1/    # REST API controllers
│   ├── Jobs/ProcessSmartImportJob  # AI extraction job
│   └── Models/                     # Eloquent models (all with SoftDeletes)
├── database/
│   └── migrations/                 # 35+ migrations
├── resources/
│   └── js/
│       ├── components/
│       │   ├── layout/             # AppLayout, Sidebar
│       │   └── ui/                 # GlassCard, DeleteConfirmModal, etc.
│       └── pages/
│           ├── Dashboard/
│           ├── Expenses/           # Index, Create, Edit, Detail
│           ├── Budget/
│           ├── Goals/
│           ├── Investments/        # Portfolio + XIRR calculator
│           ├── IncomeSources/
│           ├── MoneyFlow/          # Bank accounts + statement timeline
│           ├── AI/                 # Chat + Smart Import
│           ├── Settings/
│           └── ...
└── routes/
    ├── api.php                     # All /api/v1/* routes
    └── web.php                     # Inertia page routes
```

---

## AI Configuration

After registering, go to **Settings → AI Configuration** to configure your provider.

| Provider | Models used | Best for |
|---|---|---|
| **Anthropic Claude** | claude-opus-4-8, claude-sonnet-4-6 | Smart Import, PDF parsing, AI Chat |
| **OpenAI** | gpt-4o, gpt-4o-mini | Smart Import, AI Chat |
| **Google Gemini** | gemini-1.5-flash | Image import, AI Chat |

### What Smart Import can read

- UPI payment screenshots (GPay, PhonePe, Paytm, BHIM)
- Bank statement PDFs — sent natively to Claude, no text stripping
- Bank statement screenshots / photos
- Credit card statements
- Salary slips and receipts
- Pasted bank SMS messages

---

## API Reference (summary)

All endpoints require authentication (`/api/v1/auth/login` → session cookie or Bearer token).

```
POST /api/v1/auth/register
POST /api/v1/auth/login

GET  /api/v1/dashboard
GET  /api/v1/expenses          ?category=&date_from=&date_to=&payment_method=&amount_min=&amount_max=&sort_by=&sort_dir=
POST /api/v1/expenses
PUT  /api/v1/expenses/{id}
DEL  /api/v1/expenses/{id}

GET  /api/v1/budgets
GET  /api/v1/investments/portfolio

GET  /api/v1/bank-accounts
POST /api/v1/bank-accounts
PUT  /api/v1/bank-accounts/{id}
DEL  /api/v1/bank-accounts/{id}
POST /api/v1/bank-accounts/{id}/transactions
POST /api/v1/bank-accounts/import-statement    # multipart: account_id + file|text
GET  /api/v1/money-flow                        # unified timeline (bank + expenses)

GET  /api/v1/bank-transactions/{id}
PUT  /api/v1/bank-transactions/{id}
DEL  /api/v1/bank-transactions/{id}

POST /api/v1/smart-imports                     # AI Smart Import (file upload)
POST /api/v1/ai/chat
```

---

## Useful Commands

```bash
# Reset database with seed data
php artisan migrate:fresh --seed

# View all API routes
php artisan route:list --path="api/v1"

# Clear caches after config changes
php artisan optimize:clear

# Run tests
php artisan test

# TypeScript check
npx tsc --noEmit
```

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

Please keep PRs focused — one feature or fix per PR.

---

## Roadmap

- [ ] Recurring expense auto-categorisation
- [ ] Public demo mode (read-only with seeded data)
- [ ] Budget alerts via Web Push (VAPID)
- [ ] Mobile app (Capacitor / React Native)
- [ ] Multi-currency support with live exchange rates
- [ ] Tax report generation (Indian ITR format)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Built with

[Laravel](https://laravel.com) · [Inertia.js](https://inertiajs.com) · [React](https://react.dev) · [Tailwind CSS](https://tailwindcss.com) · [Framer Motion](https://www.framer.com/motion/) · [Recharts](https://recharts.org) · [TanStack Query](https://tanstack.com/query) · [Lucide Icons](https://lucide.dev) · [Anthropic Claude](https://anthropic.com)
