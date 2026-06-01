import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { Home, CreditCard, Car, GraduationCap, Building2, Landmark } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const DEBT_TYPES = [
    { value: 'home_loan',       label: 'Home Loan',      icon: Home,          color: '#3B82F6' },
    { value: 'personal_loan',   label: 'Personal Loan',  icon: Landmark,      color: '#F59E0B' },
    { value: 'car_loan',        label: 'Car Loan',       icon: Car,           color: '#10B981' },
    { value: 'credit_card',     label: 'Credit Card',    icon: CreditCard,    color: '#EF4444' },
    { value: 'education_loan',  label: 'Education Loan', icon: GraduationCap, color: '#8B5CF6' },
    { value: 'other',           label: 'Other',          icon: Building2,     color: '#6B7280' },
];

const STRATEGIES = [
    { value: 'none',       label: 'None' },
    { value: 'snowball',   label: 'Snowball (lowest first)' },
    { value: 'avalanche',  label: 'Avalanche (highest rate first)' },
];

export default function DebtsCreate() {
    const [form, setForm] = useState({
        name:             '',
        type:             'personal_loan',
        lender:           '',
        principal_amount: '',
        current_balance:  '',
        interest_rate:    '',
        emi_amount:       '',
        emi_due_day:      '',
        tenure_months:    '',
        strategy:         'none',
        disbursed_at:     '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/debts', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/debts'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.principal_amount || isNaN(Number(form.principal_amount))) e.principal_amount = 'Principal amount required';
        if (!form.current_balance || isNaN(Number(form.current_balance))) e.current_balance = 'Current balance required';
        if (!form.interest_rate || isNaN(Number(form.interest_rate))) e.interest_rate = 'Interest rate required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate({
            name:             form.name,
            type:             form.type,
            lender:           form.lender || undefined,
            principal_amount: parseFloat(form.principal_amount),
            current_balance:  parseFloat(form.current_balance),
            interest_rate:    parseFloat(form.interest_rate),
            emi_amount:       form.emi_amount ? parseFloat(form.emi_amount) : undefined,
            emi_due_day:      form.emi_due_day ? parseInt(form.emi_due_day) : undefined,
            tenure_months:    form.tenure_months ? parseInt(form.tenure_months) : undefined,
            strategy:         form.strategy,
            disbursed_at:     form.disbursed_at || undefined,
        });
    };

    return (
        <>
            <Head title="Add Debt" />
            <FormLayout title="Add Debt / Loan" subtitle="Track a loan, credit card, or EMI" backHref="/debts" onSave={handleSave} saving={mutation.isPending} saveLabel="Add Debt">

                <FormSection title="Loan Type">
                    <div className="grid grid-cols-3 gap-2">
                        {DEBT_TYPES.map(t => {
                            const Icon = t.icon;
                            const active = form.type === t.value;
                            return (
                                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                                    className={cn('flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all',
                                        active ? 'border-current' : 'border-white/10 text-white/50 hover:border-white/25')}
                                    style={active ? { color: t.color, borderColor: t.color, background: `${t.color}12` } : undefined}>
                                    <Icon size={20} style={active ? { color: t.color } : undefined} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </FormSection>

                <FormSection title="Loan Details">
                    <FormRow>
                        <Field label="Loan Name" required error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="e.g. HDFC Home Loan" className={inputCls} />
                        </Field>
                        <Field label="Lender / Bank">
                            <input value={form.lender} onChange={e => set('lender', e.target.value)}
                                placeholder="e.g. HDFC, SBI, ICICI" className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Principal Amount (₹)" required error={errors.principal_amount}>
                            <input type="number" value={form.principal_amount} onChange={e => set('principal_amount', e.target.value)}
                                placeholder="Original loan amount" className={inputCls} />
                        </Field>
                        <Field label="Current Balance (₹)" required error={errors.current_balance} hint="Outstanding balance today">
                            <input type="number" value={form.current_balance} onChange={e => set('current_balance', e.target.value)}
                                placeholder="Remaining balance" className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Interest Rate (% p.a.)" required error={errors.interest_rate}>
                            <input type="number" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)}
                                placeholder="e.g. 8.5" className={inputCls} />
                        </Field>
                        <Field label="Tenure (months)">
                            <input type="number" value={form.tenure_months} onChange={e => set('tenure_months', e.target.value)}
                                placeholder="e.g. 240 for 20yr" className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>

                <FormSection title="EMI Details">
                    <FormRow>
                        <Field label="EMI Amount (₹)">
                            <input type="number" value={form.emi_amount} onChange={e => set('emi_amount', e.target.value)}
                                placeholder="Monthly EMI" className={inputCls} />
                        </Field>
                        <Field label="EMI Due Day" hint="Day of month (1–31)">
                            <input type="number" min={1} max={31} value={form.emi_due_day} onChange={e => set('emi_due_day', e.target.value)}
                                placeholder="e.g. 5" className={inputCls} />
                        </Field>
                    </FormRow>
                    <Field label="Disbursement Date">
                        <input type="date" value={form.disbursed_at} onChange={e => set('disbursed_at', e.target.value)} className={inputCls} />
                    </Field>
                </FormSection>

                <FormSection title="Repayment Strategy">
                    <Field label="Strategy" hint="Snowball = pay smallest first; Avalanche = highest interest first">
                        <div className="space-y-2">
                            {STRATEGIES.map(s => (
                                <button key={s.value} type="button" onClick={() => set('strategy', s.value)}
                                    className={cn('w-full rounded-xl border px-4 py-3 text-sm text-left font-medium transition-all',
                                        form.strategy === s.value
                                            ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                                            : 'border-white/10 text-white/50 hover:border-white/25')}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </Field>
                </FormSection>
            </FormLayout>
        </>
    );
}
