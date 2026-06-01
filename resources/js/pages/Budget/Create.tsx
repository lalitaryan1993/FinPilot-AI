import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';
import type { Category, ApiResponse } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const PERIODS = [
    { value: 'monthly',  label: 'Monthly' },
    { value: 'weekly',   label: 'Weekly' },
    { value: 'custom',   label: 'Custom Range' },
];

interface BudgetFormData {
    name: string;
    amount: string;
    period: string;
    period_start: string;
    period_end: string;
    alert_at_percent: string;
    category_id: string;
}

function BudgetFormBody({ form, setForm, errors, categories }: {
    form: BudgetFormData;
    setForm: React.Dispatch<React.SetStateAction<BudgetFormData>>;
    errors: Record<string, string>;
    categories: Category[];
}) {
    const set = (k: keyof BudgetFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handlePeriodChange = (period: string) => {
        const now = new Date();
        let start = format(startOfMonth(now), 'yyyy-MM-dd');
        let end   = format(endOfMonth(now), 'yyyy-MM-dd');
        if (period === 'weekly') {
            const day = now.getDay();
            const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            start = format(mon, 'yyyy-MM-dd');
            end   = format(sun, 'yyyy-MM-dd');
        }
        setForm(f => ({ ...f, period, period_start: start, period_end: end }));
    };

    return (
        <>
            <FormSection title="Budget Details">
                <Field label="Budget Name" required error={errors.name}>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Monthly Groceries, Family Dining" className={inputCls} />
                </Field>
                <FormRow>
                    <Field label="Budget Amount (₹)" required error={errors.amount}>
                        <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0" className={inputCls} />
                    </Field>
                    <Field label="Alert at (% used)" hint="Get alerted when this % is spent">
                        <input type="number" min={1} max={100} value={form.alert_at_percent}
                            onChange={e => set('alert_at_percent', e.target.value)}
                            className={inputCls} />
                    </Field>
                </FormRow>
                <Field label="Link to Category" hint="Optional — leave blank for an overall budget">
                    <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inputCls}>
                        <option value="">Overall (all categories)</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
            </FormSection>

            <FormSection title="Period">
                <Field label="Budget Period">
                    <div className="flex gap-2">
                        {PERIODS.map(p => (
                            <button key={p.value} type="button" onClick={() => handlePeriodChange(p.value)}
                                className={cn('flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
                                    form.period === p.value
                                        ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                                        : 'border-white/10 text-white/50 hover:border-white/25')}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </Field>
                <FormRow>
                    <Field label="Start Date" required error={errors.period_start}>
                        <input type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="End Date" required error={errors.period_end}>
                        <input type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)} className={inputCls} />
                    </Field>
                </FormRow>
            </FormSection>
        </>
    );
}

export default function BudgetCreate() {
    const now = new Date();
    const [form, setForm] = useState<BudgetFormData>({
        name: '',
        amount: '',
        period: 'monthly',
        period_start: format(startOfMonth(now), 'yyyy-MM-dd'),
        period_end:   format(endOfMonth(now),   'yyyy-MM-dd'),
        alert_at_percent: '80',
        category_id: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const r = await fetch('/api/v1/categories', { credentials: 'include' });
            const j: ApiResponse<Category[]> = await r.json();
            return j.data ?? [];
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/budgets', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/budget'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount required';
        if (!form.period_start) e.period_start = 'Start date required';
        if (!form.period_end) e.period_end = 'End date required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate({
            name:             form.name,
            amount:           parseFloat(form.amount),
            period:           form.period,
            period_start:     form.period_start,
            period_end:       form.period_end,
            alert_at_percent: parseInt(form.alert_at_percent) || 80,
            category_id:      form.category_id ? parseInt(form.category_id) : undefined,
        });
    };

    return (
        <>
            <Head title="Create Budget" />
            <FormLayout title="Create Budget" subtitle="Set a spending limit for a period" backHref="/budget" onSave={handleSave} saving={mutation.isPending} saveLabel="Create Budget">
                <BudgetFormBody form={form} setForm={setForm} errors={errors} categories={categories} />
            </FormLayout>
        </>
    );
}
