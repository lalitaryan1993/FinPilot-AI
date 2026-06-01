import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    KeyRound, Sparkles, ArrowLeft, Save, Loader2, Check,
    Eye, EyeOff, Wifi, WifiOff, AlertCircle, Settings,
    Bot, TrendingUp, TrendingDown, Target, PiggyBank,
    ShieldAlert, BarChart3, ExternalLink,
    Cpu, Zap, Brain, Globe,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

// ─── Provider config ──────────────────────────────────────────────
const PROVIDERS = [
    {
        id: 'anthropic', name: 'Anthropic Claude', logo: '🤖',
        color: '#D4A574', tier: 'top',
        description: 'Powers Smart Import vision & AI agents. Claude Opus, Sonnet, Haiku.',
        docsUrl: 'https://console.anthropic.com/settings/keys',
        models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
        keyField: 'anthropic.api_key',
    },
    {
        id: 'openai', name: 'OpenAI', logo: '⚡',
        color: '#10A37F', tier: 'top',
        description: 'GPT-4o, o1 and embeddings. Great for general chat.',
        docsUrl: 'https://platform.openai.com/api-keys',
        models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
        keyField: 'openai.api_key',
    },
    {
        id: 'gemini', name: 'Google Gemini', logo: '💎',
        color: '#4285F4', tier: 'top',
        description: 'Gemini 2.0 Flash, Pro. Best for vision & multimodal.',
        docsUrl: 'https://aistudio.google.com/app/apikey',
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        keyField: 'gemini.api_key',
    },
    {
        id: 'groq', name: 'Groq', logo: '🚀',
        color: '#F55036', tier: 'fast',
        description: 'Ultra-fast inference. Llama 3.3, Mixtral, Gemma.',
        docsUrl: 'https://console.groq.com/keys',
        models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        keyField: 'groq.api_key',
    },
    {
        id: 'deepseek', name: 'DeepSeek', logo: '🌊',
        color: '#4C7BF4', tier: 'fast',
        description: 'DeepSeek R1, V3. Excellent reasoning at low cost.',
        docsUrl: 'https://platform.deepseek.com/api_keys',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        keyField: 'deepseek.api_key',
    },
    {
        id: 'mistral', name: 'Mistral AI', logo: '🌪️',
        color: '#FF7000', tier: 'fast',
        description: 'Mistral Large, Small. European privacy-focused AI.',
        docsUrl: 'https://console.mistral.ai/api-keys',
        models: ['mistral-large-latest', 'mistral-small-latest'],
        keyField: 'mistral.api_key',
    },
    {
        id: 'cohere', name: 'Cohere', logo: '🔗',
        color: '#39594D', tier: 'other',
        description: 'Command R+. Best for RAG and reranking.',
        docsUrl: 'https://dashboard.cohere.com/api-keys',
        models: ['command-r-plus', 'command-r'],
        keyField: 'cohere.api_key',
    },
    {
        id: 'xai', name: 'xAI Grok', logo: '𝕏',
        color: '#1DA1F2', tier: 'other',
        description: 'Grok 2. Real-time web access, candid responses.',
        docsUrl: 'https://console.x.ai/',
        models: ['grok-2', 'grok-2-vision'],
        keyField: 'xai.api_key',
    },
    {
        id: 'openrouter', name: 'OpenRouter', logo: '🔀',
        color: '#7C3AED', tier: 'other',
        description: 'Unified API for 200+ models. Great for fallbacks.',
        docsUrl: 'https://openrouter.ai/keys',
        models: ['auto'],
        keyField: 'openrouter.api_key',
    },
    {
        id: 'ollama', name: 'Ollama (Local)', logo: '🖥️',
        color: '#64748B', tier: 'local',
        description: 'Run Llama, Mistral, Phi locally. No API key needed.',
        docsUrl: 'https://ollama.com',
        models: ['llama3.2', 'mistral', 'phi4', 'qwen2.5'],
        keyField: 'ollama.url',
        isUrl: true,
    },
] as const;

// ─── Agent config ─────────────────────────────────────────────────
const AGENTS = [
    {
        id: 'budget', name: 'Budget Advisor', icon: PiggyBank, color: '#10B981',
        description: 'Analyses spending patterns, suggests budgets, alerts on overruns.',
        tools: ['GetExpensesSummary', 'GetBudgetStatus'],
        enabledKey: 'agent.budget.enabled',
        providerKey: 'agent.budget.provider',
        modelKey: 'agent.budget.model',
    },
    {
        id: 'savings', name: 'Savings Coach', icon: TrendingUp, color: '#3B82F6',
        description: 'Identifies savings opportunities, SIP suggestions, 50/30/20 tracking.',
        tools: ['GetExpensesSummary', 'GetGoalProgress'],
        enabledKey: 'agent.savings.enabled',
        providerKey: 'agent.savings.provider',
        modelKey: 'agent.savings.model',
    },
    {
        id: 'debt', name: 'Debt Manager', icon: TrendingDown, color: '#EF4444',
        description: 'EMI calendar, avalanche/snowball strategies, payoff projections.',
        tools: ['GetDebtSummary'],
        enabledKey: 'agent.debt.enabled',
        providerKey: 'agent.debt.provider',
        modelKey: 'agent.debt.model',
    },
    {
        id: 'goal', name: 'Goal Planner', icon: Target, color: '#F5C842',
        description: 'Tracks savings goals, SIP recommendations, timeline projections.',
        tools: ['GetGoalProgress', 'GetFinancialHealth'],
        enabledKey: 'agent.goal.enabled',
        providerKey: 'agent.goal.provider',
        modelKey: 'agent.goal.model',
    },
    {
        id: 'analytics', name: 'Analytics Engine', icon: BarChart3, color: '#8B5CF6',
        description: 'Deep financial analysis, trends, seasonal patterns, forecasting.',
        tools: ['GetExpensesSummary', 'GetFinancialHealth'],
        enabledKey: 'agent.analytics.enabled',
        providerKey: 'agent.analytics.provider',
        modelKey: 'agent.analytics.model',
    },
    {
        id: 'fraud', name: 'Fraud Detection', icon: ShieldAlert, color: '#F97316',
        description: 'Flags unusual transactions, duplicate charges, subscription creep.',
        tools: ['GetExpensesSummary'],
        enabledKey: 'agent.fraud.enabled',
        providerKey: 'agent.fraud.provider',
        modelKey: 'agent.fraud.model',
    },
] as const;

const DEFAULT_KEYS = [
    { key: 'default.chat',         label: 'Chat & Agents',        desc: 'Used for AI Chat and all agents',                icon: Bot },
    { key: 'default.vision',       label: 'Vision / Smart Import',desc: 'Used when processing images and screenshots',    icon: Brain },
    { key: 'default.fast',         label: 'Fast Inference',       desc: 'Used for quick, low-latency responses',          icon: Zap },
    { key: 'default.embeddings',   label: 'Embeddings',           desc: 'Used for semantic search and similarity',        icon: Cpu },
];

// ─── API ──────────────────────────────────────────────────────────
async function loadSettings(): Promise<Record<string, string>> {
    const r = await fetch('/api/v1/ai-settings', { credentials: 'include' });
    return (await r.json()).data ?? {};
}
async function saveSettings(settings: Record<string, string>): Promise<void> {
    await fetch('/api/v1/ai-settings', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ settings }),
    });
}
async function testProvider(provider: string): Promise<{ success: boolean; message: string }> {
    const r = await fetch('/api/v1/ai-settings/test', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ provider }),
    });
    return r.json();
}

// ─── Key Input ────────────────────────────────────────────────────
function KeyInput({ value, onChange, placeholder, isUrl = false }: {
    value: string; onChange: (v: string) => void; placeholder?: string; isUrl?: boolean;
}) {
    const [show, setShow] = useState(false);
    const isEnvVal = value.includes('(env)');

    return (
        <div className="relative">
            <input
                type={show || isUrl ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? (isUrl ? 'http://localhost:11434' : 'sk-...')}
                className={cn(
                    'w-full rounded-xl border bg-white/5 py-2.5 pl-3 pr-10 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-blue-500/50 font-mono',
                    isEnvVal ? 'border-emerald-500/25 text-emerald-300/60' : 'border-white/10',
                )}
            />
            {!isUrl && (
                <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            )}
        </div>
    );
}

// ─── Provider Card ────────────────────────────────────────────────
function ProviderCard({ provider, keyValue, onChange, onSave, onTest, saving, testing, testResult }: {
    provider: typeof PROVIDERS[number];
    keyValue: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onTest: () => void;
    saving: boolean;
    testing: boolean;
    testResult: { ok: boolean; msg: string } | null;
}) {
    const hasKey = keyValue && !keyValue.includes('(env)') ? keyValue.length > 0 : keyValue.includes('(env)') || keyValue.length > 0;
    const fromEnv = keyValue.includes('(env)');

    const tierColors: Record<string, string> = {
        top: '#F5C842', fast: '#10B981', other: '#8B5CF6', local: '#64748B',
    };
    const tierLabels: Record<string, string> = {
        top: 'Recommended', fast: 'Fast', other: 'Available', local: 'Local',
    };

    return (
        <div className={cn(
            'rounded-2xl border p-5 transition-all',
            hasKey ? 'border-white/12 bg-white/3' : 'border-white/6 bg-white/2',
        )}>
            <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl leading-none mt-0.5">{provider.logo}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ background: `${tierColors[provider.tier]}18`, color: tierColors[provider.tier] }}>
                            {tierLabels[provider.tier]}
                        </span>
                        {hasKey && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                <Wifi size={9} /> {fromEnv ? 'env' : 'set'}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{provider.description}</p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-white/50 flex items-center justify-between">
                    <span>{'isUrl' in provider && provider.isUrl ? 'Server URL' : 'API Key'}</span>
                    <a href={provider.docsUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                        Get key <ExternalLink size={10} />
                    </a>
                </label>
                <KeyInput
                    value={keyValue}
                    onChange={onChange}
                    isUrl={'isUrl' in provider && provider.isUrl}
                    placeholder={'isUrl' in provider && provider.isUrl ? 'http://localhost:11434' : `${provider.id}-api-key`}
                />

                <div className="flex gap-2 pt-1">
                    <button onClick={onSave} disabled={saving || fromEnv}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/25 disabled:opacity-40 transition-all">
                        {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        Save
                    </button>
                    <button onClick={onTest} disabled={testing || !hasKey}
                        className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-all">
                        {testing ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />}
                        Test
                    </button>
                </div>

                {testResult && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs',
                            testResult.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                        {testResult.ok ? <Wifi size={11} /> : <WifiOff size={11} />}
                        {testResult.msg}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// ─── Agent Card ───────────────────────────────────────────────────
function AgentCard({ agent, settings, onChange }: {
    agent: typeof AGENTS[number];
    settings: Record<string, string>;
    onChange: (key: string, val: string) => void;
}) {
    const Icon = agent.icon;
    const enabled   = settings[agent.enabledKey] !== 'false';
    const provider  = settings[agent.providerKey] ?? 'anthropic';
    const model     = settings[agent.modelKey] ?? '';

    const providerOptions = PROVIDERS.map(p => ({ value: p.id, label: p.name }));
    const selectedProvider = PROVIDERS.find(p => p.id === provider);
    const modelOptions = selectedProvider?.models ?? [];

    return (
        <div className={cn('rounded-2xl border p-5 transition-all', enabled ? 'border-white/10 bg-white/3' : 'border-white/5 bg-white/1 opacity-60')}>
            <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${agent.color}18` }}>
                    <Icon size={18} style={{ color: agent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                        {/* Toggle */}
                        <button onClick={() => onChange(agent.enabledKey, enabled ? 'false' : 'true')}
                            className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', enabled ? 'bg-blue-500' : 'bg-white/15')}>
                            <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', enabled ? 'right-0.5' : 'left-0.5')} />
                        </button>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{agent.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {agent.tools.map(t => (
                            <span key={t} className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-white/40">{t}</span>
                        ))}
                    </div>
                </div>
            </div>

            {enabled && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Provider</label>
                        <select value={provider} onChange={e => { onChange(agent.providerKey, e.target.value); onChange(agent.modelKey, ''); }}
                            className="w-full rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50">
                            {providerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Model</label>
                        {modelOptions.length > 0 ? (
                            <select value={model} onChange={e => onChange(agent.modelKey, e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50">
                                <option value="">Default</option>
                                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input value={model} onChange={e => onChange(agent.modelKey, e.target.value)}
                                placeholder="Model name"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 font-mono" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function AISettings(_: PageProps) {
    const [tab, setTab] = useState<'providers' | 'agents' | 'defaults'>('providers');
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Per-provider save/test state
    const [providerSaving, setProviderSaving] = useState<string | null>(null);
    const [providerTesting, setProviderTesting] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

    useEffect(() => {
        loadSettings().then(data => { setSettings(data); setLoading(false); });
    }, []);

    const set = (key: string, val: string) => setSettings(p => ({ ...p, [key]: val }));

    const handleProviderSave = async (provider: typeof PROVIDERS[number]) => {
        setProviderSaving(provider.id);
        try {
            await saveSettings({ [provider.keyField]: settings[provider.keyField] ?? '' });
        } finally {
            setProviderSaving(null);
        }
    };

    const handleProviderTest = async (provider: typeof PROVIDERS[number]) => {
        setProviderTesting(provider.id);
        try {
            const result = await testProvider(provider.id);
            setTestResults(p => ({ ...p, [provider.id]: { ok: result.success, msg: result.message } }));
        } finally {
            setProviderTesting(null);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await saveSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally {
            setSaving(false);
        }
    };

    const tierGroups = [
        { tier: 'top',   label: 'Recommended',  color: '#F5C842' },
        { tier: 'fast',  label: 'Fast & Cheap',  color: '#10B981' },
        { tier: 'other', label: 'More Providers', color: '#8B5CF6' },
        { tier: 'local', label: 'Local / Self-Hosted', color: '#64748B' },
    ];

    return (
        <AppLayout>
            <Head title="AI Configuration" />
            <div className="p-6 space-y-6 max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.visit('/settings')}
                            className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/8 transition-all">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <KeyRound size={18} className="text-amber-400" />
                                <h1 className="text-xl font-bold text-white">AI Configuration</h1>
                            </div>
                            <p className="text-sm text-white/40 mt-0.5">Manage API keys, agents, and AI provider defaults</p>
                        </div>
                    </div>

                    <button onClick={handleSaveAll} disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save All</>}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl bg-white/4 p-1 border border-white/8">
                    {[
                        { id: 'providers', label: 'API Keys', icon: KeyRound },
                        { id: 'agents',    label: 'Agents',   icon: Bot },
                        { id: 'defaults',  label: 'Defaults', icon: Settings },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                            className={cn(
                                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                                tab === t.id
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                            )}>
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/4 animate-pulse" />)}
                    </div>
                ) : (
                    <AnimatePresence mode="wait">

                        {/* ── Providers Tab ── */}
                        {tab === 'providers' && (
                            <motion.div key="providers" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-6">

                                {/* Security notice */}
                                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/6 px-4 py-3">
                                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-300/70">
                                        <strong className="text-amber-300">Keys are stored encrypted</strong> in the database — they never leave your server.
                                        Keys set via <code className="text-amber-200">.env</code> are shown as <em>"(env)"</em> and cannot be overwritten here.
                                    </div>
                                </div>

                                {tierGroups.map(group => {
                                    const groupProviders = PROVIDERS.filter(p => p.tier === group.tier);
                                    return (
                                        <div key={group.tier}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-px flex-1 bg-white/6" />
                                                <span className="text-[10px] font-semibold uppercase tracking-widest px-2"
                                                    style={{ color: group.color }}>{group.label}</span>
                                                <div className="h-px flex-1 bg-white/6" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {groupProviders.map(provider => (
                                                    <ProviderCard
                                                        key={provider.id}
                                                        provider={provider}
                                                        keyValue={settings[provider.keyField] ?? ''}
                                                        onChange={v => set(provider.keyField, v)}
                                                        onSave={() => handleProviderSave(provider)}
                                                        onTest={() => handleProviderTest(provider)}
                                                        saving={providerSaving === provider.id}
                                                        testing={providerTesting === provider.id}
                                                        testResult={testResults[provider.id] ?? null}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}

                        {/* ── Agents Tab ── */}
                        {tab === 'agents' && (
                            <motion.div key="agents" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <p className="text-sm text-white/50">
                                    Each AI agent has a dedicated role. Choose which provider and model powers each one, or disable agents you don't need.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {AGENTS.map(agent => (
                                        <AgentCard
                                            key={agent.id}
                                            agent={agent}
                                            settings={settings}
                                            onChange={set}
                                        />
                                    ))}
                                </div>

                                {/* Smart Import agent */}
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15">
                                            <Sparkles size={18} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">Smart Import — Vision Model</h3>
                                            <p className="text-xs text-white/40">Model used to extract transactions from screenshots & PDFs</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-white/40 mb-1 block">Provider</label>
                                            <select
                                                value={settings['smart_import.provider'] ?? 'anthropic'}
                                                onChange={e => {
                                                    const prov = e.target.value;
                                                    const defaults: Record<string, string> = {
                                                        anthropic: 'claude-opus-4-8',
                                                        openai: 'gpt-4o',
                                                        gemini: 'gemini-1.5-flash',
                                                        groq: 'llama-3.3-70b-versatile',
                                                        deepseek: 'deepseek-chat',
                                                        mistral: 'mistral-large-latest',
                                                        xai: 'grok-2-vision',
                                                        openrouter: 'auto',
                                                    };
                                                    set('smart_import.provider', prov);
                                                    set('smart_import.model', defaults[prov] ?? '');
                                                }}
                                                className="w-full rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-xs text-white outline-none">
                                                {PROVIDERS.filter(p => p.id !== 'ollama' && p.id !== 'cohere').map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 mb-1 block">Model</label>
                                            {(() => {
                                                const prov = settings['smart_import.provider'] ?? 'anthropic';
                                                const providerObj = PROVIDERS.find(p => p.id === prov);
                                                const models = providerObj?.models ?? [];
                                                const current = settings['smart_import.model'] ?? models[0] ?? '';
                                                return models.length > 0 ? (
                                                    <select value={current}
                                                        onChange={e => set('smart_import.model', e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-xs text-white outline-none">
                                                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                ) : (
                                                    <input value={current}
                                                        onChange={e => set('smart_import.model', e.target.value)}
                                                        placeholder="model name"
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none font-mono" />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <p className="mt-2.5 text-[10px] text-amber-400/60">
                                        ⭐ Anthropic Claude Opus gives best accuracy for Indian financial documents
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button onClick={handleSaveAll} disabled={saving}
                                        className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all">
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Agent Config</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Defaults Tab ── */}
                        {tab === 'defaults' && (
                            <motion.div key="defaults" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="space-y-5">

                                {/* Default providers */}
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                        <Globe size={14} className="text-white/40" /> Default Providers
                                    </h3>
                                    <div className="space-y-3">
                                        {DEFAULT_KEYS.map(d => (
                                            <div key={d.key} className="flex items-center gap-4">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                                    <d.icon size={14} className="text-white/40" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium">{d.label}</p>
                                                    <p className="text-xs text-white/40">{d.desc}</p>
                                                </div>
                                                <select value={settings[d.key] ?? 'anthropic'}
                                                    onChange={e => set(d.key, e.target.value)}
                                                    className="w-36 rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50">
                                                    {PROVIDERS.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>

                                {/* Generation settings */}
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                        <Cpu size={14} className="text-white/40" /> Generation Settings
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Temperature */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs text-white/50">Temperature</label>
                                                <span className="text-xs font-mono text-white/70">{settings['gen.temperature'] ?? '0.7'}</span>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1"
                                                value={settings['gen.temperature'] ?? '0.7'}
                                                onChange={e => set('gen.temperature', e.target.value)}
                                                className="w-full accent-blue-500" />
                                            <div className="flex justify-between text-[10px] text-white/25 mt-0.5">
                                                <span>Precise</span><span>Balanced</span><span>Creative</span>
                                            </div>
                                        </div>

                                        {/* Max tokens */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs text-white/50">Max Response Length</label>
                                                <span className="text-xs font-mono text-white/70">{settings['gen.max_tokens'] ?? '2048'} tokens</span>
                                            </div>
                                            <input type="range" min="256" max="8192" step="256"
                                                value={settings['gen.max_tokens'] ?? '2048'}
                                                onChange={e => set('gen.max_tokens', e.target.value)}
                                                className="w-full accent-blue-500" />
                                            <div className="flex justify-between text-[10px] text-white/25 mt-0.5">
                                                <span>256</span><span>4k</span><span>8k</span>
                                            </div>
                                        </div>

                                        {/* Streaming */}
                                        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white/80">Streaming Responses</p>
                                                <p className="text-xs text-white/35">Show AI replies token by token as they arrive</p>
                                            </div>
                                            <button onClick={() => set('gen.streaming', settings['gen.streaming'] === 'false' ? 'true' : 'false')}
                                                className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                                    settings['gen.streaming'] !== 'false' ? 'bg-blue-500' : 'bg-white/15')}>
                                                <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                                                    settings['gen.streaming'] !== 'false' ? 'right-0.5' : 'left-0.5')} />
                                            </button>
                                        </div>

                                        {/* Language */}
                                        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white/80">Indian Finance Context</p>
                                                <p className="text-xs text-white/35">AI uses INR, EMI, SIP, 80C, UPI terminology by default</p>
                                            </div>
                                            <button onClick={() => set('gen.india_context', settings['gen.india_context'] === 'false' ? 'true' : 'false')}
                                                className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                                    settings['gen.india_context'] !== 'false' ? 'bg-blue-500' : 'bg-white/15')}>
                                                <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                                                    settings['gen.india_context'] !== 'false' ? 'right-0.5' : 'left-0.5')} />
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>

                                <div className="flex justify-end">
                                    <button onClick={handleSaveAll} disabled={saving}
                                        className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60 transition-all">
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Defaults</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </AppLayout>
    );
}
