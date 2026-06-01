import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { Budget, Category, ApiResponse, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const PERIODS = [{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'custom', label: 'Custom Range' }];

interface Props extends PageProps { id: number; }

export default function BudgetEdit({ id }: Props) {
    const { data: budget, isLoading } = useQuery<Budget>({
        queryKey: ['budget', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/budgets/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const r = await fetch('/api/v1/categories', { credentials: 'include' });
            const j: ApiResponse<Category[]> = await r.json();
            return j.data ?? [];
        },
    });

    const [form, setForm] = useState<Record<string, string> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (budget && !form) {
        setForm({
            name:             budget.name ?? '',
            amount:           String(budget.amount ?? ''),
            period:           budget.period ?? 'monthly',
            period_start:     budget.period_start ?? format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            period_end:       budget.period_end ?? format(endOfMonth(new Date()), 'yyyy-MM-dd'),
            alert_at_percent: String(budget.alert_at_percent ?? 80),
            category_id:      String(budget.category_id ?? ''),
        });
    }

    const set = (k: string, v: string) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/budgets/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/budget'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/budgets/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/budget'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form?.name?.trim()) e.name = 'Name required';
        if (!form?.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !form) return;
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

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Budget" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Budget" />
            <FormLayout title="Edit Budget" subtitle="Update your budget settings" backHref="/budget" onSave={handleSave} saving={mutation.isPending}>
                <FormSection title="Budget Details">
                    <Field label="Budget Name" required error={errors.name}>
                        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Monthly Groceries" className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Amount (₹)" required error={errors.amount}>
                            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Alert at (%)">
                            <input type="number" min={1} max={100} value={form.alert_at_percent}
                                onChange={e => set('alert_at_percent', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                    <Field label="Category">
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
                                <button key={p.value} type="button" onClick={() => set('period', p.value)}
                                    className={cn('flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
                                        form.period === p.value ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <FormRow>
                        <Field label="Start Date">
                            <input type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="End Date">
                            <input type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>
                <DeleteSection label="Budget" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
