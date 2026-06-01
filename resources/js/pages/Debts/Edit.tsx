import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Home, CreditCard, Car, GraduationCap, Building2, Landmark } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { Debt, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const DEBT_TYPES = [
    { value: 'home_loan',      label: 'Home Loan',      icon: Home,          color: '#3B82F6' },
    { value: 'personal_loan',  label: 'Personal Loan',  icon: Landmark,      color: '#F59E0B' },
    { value: 'car_loan',       label: 'Car Loan',       icon: Car,           color: '#10B981' },
    { value: 'credit_card',    label: 'Credit Card',    icon: CreditCard,    color: '#EF4444' },
    { value: 'education_loan', label: 'Education Loan', icon: GraduationCap, color: '#8B5CF6' },
    { value: 'other',          label: 'Other',          icon: Building2,     color: '#6B7280' },
];

const STRATEGIES = [
    { value: 'none',      label: 'None' },
    { value: 'snowball',  label: 'Snowball (lowest first)' },
    { value: 'avalanche', label: 'Avalanche (highest rate first)' },
];

const STATUS_OPTIONS = [
    { value: 'active',   label: 'Active' },
    { value: 'closed',   label: 'Closed / Paid Off' },
    { value: 'defaulted',label: 'Defaulted' },
];

interface Props extends PageProps { id: number; }

export default function DebtsEdit({ id }: Props) {
    const { data: debt, isLoading } = useQuery<Debt>({
        queryKey: ['debt', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/debts/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const [form, setForm] = useState<Record<string, string> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (debt && !form) {
        setForm({
            name:             debt.name ?? '',
            type:             debt.type ?? 'personal_loan',
            lender:           debt.lender ?? '',
            principal_amount: String(debt.principal_amount ?? ''),
            current_balance:  String(debt.current_balance ?? ''),
            interest_rate:    String(debt.interest_rate ?? ''),
            emi_amount:       String(debt.emi_amount ?? ''),
            emi_due_day:      String(debt.emi_due_day ?? ''),
            tenure_months:    String(debt.tenure_months ?? ''),
            strategy:         debt.strategy ?? 'none',
            status:           debt.status ?? 'active',
        });
    }

    const set = (k: string, v: string) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/debts/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/debts'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/debts/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/debts'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form?.name?.trim()) e.name = 'Name required';
        if (!form?.current_balance || isNaN(Number(form.current_balance))) e.current_balance = 'Balance required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !form) return;
        mutation.mutate({
            name:            form.name,
            current_balance: parseFloat(form.current_balance),
            interest_rate:   form.interest_rate ? parseFloat(form.interest_rate) : undefined,
            emi_amount:      form.emi_amount ? parseFloat(form.emi_amount) : undefined,
            emi_due_day:     form.emi_due_day ? parseInt(form.emi_due_day) : undefined,
            strategy:        form.strategy,
            status:          form.status,
        });
    };

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Debt" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Debt" />
            <FormLayout title="Edit Debt" subtitle="Update loan details" backHref="/debts" onSave={handleSave} saving={mutation.isPending}>
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
                        <Field label="Name" required error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Lender / Bank">
                            <input value={form.lender} onChange={e => set('lender', e.target.value)} placeholder="e.g. HDFC" className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Current Balance (₹)" required error={errors.current_balance}>
                            <input type="number" value={form.current_balance} onChange={e => set('current_balance', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Interest Rate (% p.a.)">
                            <input type="number" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="EMI Amount (₹)">
                            <input type="number" value={form.emi_amount} onChange={e => set('emi_amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="EMI Due Day (1–31)">
                            <input type="number" min={1} max={31} value={form.emi_due_day} onChange={e => set('emi_due_day', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>
                <FormSection title="Strategy & Status">
                    <Field label="Repayment Strategy">
                        <div className="space-y-2">
                            {STRATEGIES.map(s => (
                                <button key={s.value} type="button" onClick={() => set('strategy', s.value)}
                                    className={cn('w-full rounded-xl border px-4 py-2.5 text-sm text-left font-medium transition-all',
                                        form.strategy === s.value ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Status">
                        <div className="flex gap-2">
                            {STATUS_OPTIONS.map(s => (
                                <button key={s.value} type="button" onClick={() => set('status', s.value)}
                                    className={cn('flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
                                        form.status === s.value ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </Field>
                </FormSection>
                <DeleteSection label="Debt" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
