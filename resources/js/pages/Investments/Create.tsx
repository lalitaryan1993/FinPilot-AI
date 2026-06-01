import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { TrendingUp, Building2, Coins, BarChart2, PiggyBank, RefreshCw } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const INV_TYPES = [
    { value: 'mutual_fund',  label: 'Mutual Fund',    icon: BarChart2,  color: '#3B82F6' },
    { value: 'stock',        label: 'Stocks',          icon: TrendingUp, color: '#10B981' },
    { value: 'fd',           label: 'Fixed Deposit',   icon: Building2,  color: '#F59E0B' },
    { value: 'rd',           label: 'Recurring Dep.',  icon: RefreshCw,  color: '#F97316' },
    { value: 'ppf',          label: 'PPF',             icon: PiggyBank,  color: '#8B5CF6' },
    { value: 'epf',          label: 'EPF',             icon: PiggyBank,  color: '#6366F1' },
    { value: 'nps',          label: 'NPS',             icon: PiggyBank,  color: '#EC4899' },
    { value: 'gold',         label: 'Gold',            icon: Coins,      color: '#F5C842' },
    { value: 'real_estate',  label: 'Real Estate',     icon: Building2,  color: '#14B8A6' },
    { value: 'crypto',       label: 'Crypto',          icon: Coins,      color: '#EF4444' },
    { value: 'bonds',        label: 'Bonds',           icon: BarChart2,  color: '#84CC16' },
    { value: 'other',        label: 'Other',           icon: BarChart2,  color: '#6B7280' },
];

export default function InvestmentsCreate() {
    const [form, setForm] = useState({
        name: '', type: 'mutual_fund', symbol: '',
        invested_amount: '', current_value: '',
        units: '', buy_price: '', current_price: '',
        is_sip: false, sip_amount: '', sip_day: '',
        started_at: '', maturity_at: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/investments', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/investments'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name required';
        if (!form.invested_amount || isNaN(Number(form.invested_amount))) e.invested_amount = 'Invested amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const payload: Record<string, unknown> = {
            name: form.name, type: form.type,
            invested_amount: parseFloat(form.invested_amount),
            is_sip: form.is_sip,
        };
        if (form.symbol) payload.symbol = form.symbol;
        if (form.current_value) payload.current_value = parseFloat(form.current_value);
        if (form.units) payload.units = parseFloat(form.units);
        if (form.buy_price) payload.buy_price = parseFloat(form.buy_price);
        if (form.current_price) payload.current_price = parseFloat(form.current_price);
        if (form.is_sip && form.sip_amount) payload.sip_amount = parseFloat(form.sip_amount);
        if (form.is_sip && form.sip_day) payload.sip_day = parseInt(form.sip_day);
        if (form.started_at) payload.started_at = form.started_at;
        if (form.maturity_at) payload.maturity_at = form.maturity_at;
        mutation.mutate(payload);
    };

    const showPriceFields = ['mutual_fund', 'stock', 'crypto'].includes(form.type);

    return (
        <>
            <Head title="Add Investment" />
            <FormLayout title="Add Investment" subtitle="Track a new holding in your portfolio" backHref="/investments" onSave={handleSave} saving={mutation.isPending} saveLabel="Add Investment">

                <FormSection title="Asset Type">
                    <div className="grid grid-cols-4 gap-2">
                        {INV_TYPES.map(t => {
                            const Icon = t.icon;
                            const active = form.type === t.value;
                            return (
                                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                                    className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all',
                                        active ? 'border-current' : 'border-white/10 text-white/50 hover:border-white/25')}
                                    style={active ? { color: t.color, borderColor: t.color, background: `${t.color}12` } : undefined}>
                                    <Icon size={18} style={active ? { color: t.color } : undefined} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </FormSection>

                <FormSection title="Holding Details">
                    <FormRow>
                        <Field label="Name" required error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="e.g. HDFC Nifty 50 Fund" className={inputCls} />
                        </Field>
                        <Field label="Ticker / Symbol">
                            <input value={form.symbol} onChange={e => set('symbol', e.target.value)}
                                placeholder="e.g. HDFCNIFTY" className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Invested Amount (₹)" required error={errors.invested_amount}>
                            <input type="number" value={form.invested_amount} onChange={e => set('invested_amount', e.target.value)}
                                placeholder="Total amount invested" className={inputCls} />
                        </Field>
                        <Field label="Current Value (₹)" hint="Leave blank to use invested amount">
                            <input type="number" value={form.current_value} onChange={e => set('current_value', e.target.value)}
                                placeholder="Current market value" className={inputCls} />
                        </Field>
                    </FormRow>

                    {showPriceFields && (
                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Units / Quantity">
                                <input type="number" step="0.000001" value={form.units} onChange={e => set('units', e.target.value)}
                                    placeholder="0" className={inputCls} />
                            </Field>
                            <Field label="Buy Price (₹)">
                                <input type="number" step="0.01" value={form.buy_price} onChange={e => set('buy_price', e.target.value)}
                                    placeholder="Per unit" className={inputCls} />
                            </Field>
                            <Field label="Current Price (₹)" hint="CMP / NAV">
                                <input type="number" step="0.01" value={form.current_price} onChange={e => set('current_price', e.target.value)}
                                    placeholder="Current price" className={inputCls} />
                            </Field>
                        </div>
                    )}
                </FormSection>

                <FormSection title="SIP Details">
                    <div className="flex items-center gap-3 mb-3">
                        <button type="button" onClick={() => set('is_sip', !form.is_sip)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${form.is_sip ? 'bg-blue-500' : 'bg-white/15'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${form.is_sip ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm text-white/70">This is a SIP (Systematic Investment Plan)</span>
                    </div>
                    {form.is_sip && (
                        <FormRow>
                            <Field label="SIP Amount (₹/month)">
                                <input type="number" value={form.sip_amount} onChange={e => set('sip_amount', e.target.value)}
                                    placeholder="Monthly SIP amount" className={inputCls} />
                            </Field>
                            <Field label="SIP Debit Day (1–31)">
                                <input type="number" min={1} max={31} value={form.sip_day} onChange={e => set('sip_day', e.target.value)}
                                    placeholder="Day of month" className={inputCls} />
                            </Field>
                        </FormRow>
                    )}
                </FormSection>

                <FormSection title="Dates">
                    <FormRow>
                        <Field label="Investment Started">
                            <input type="date" value={form.started_at} onChange={e => set('started_at', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Maturity Date" hint="For FD/RD/bonds">
                            <input type="date" value={form.maturity_at} onChange={e => set('maturity_at', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>
            </FormLayout>
        </>
    );
}
