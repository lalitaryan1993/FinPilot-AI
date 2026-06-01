import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { IncomeSource, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const TYPES = ['salary','freelance','rental','dividends','business','pension','side_hustle','other'];
const TYPE_LABELS: Record<string, string> = {
    salary: 'Salary', freelance: 'Freelance', rental: 'Rental', dividends: 'Dividends',
    business: 'Business', pension: 'Pension', side_hustle: 'Side Hustle', other: 'Other',
};
const FREQUENCIES = ['one_time','daily','weekly','biweekly','monthly','quarterly','annually'];
const FREQ_LABELS: Record<string, string> = {
    one_time: 'One Time', daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
    monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually',
};

interface Props extends PageProps { id: number; }

export default function IncomeSourcesEdit({ id }: Props) {
    const { data: source, isLoading } = useQuery<IncomeSource>({
        queryKey: ['income-source', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/income-sources/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const [form, setForm] = useState<Record<string, string | boolean> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (source && !form) {
        setForm({
            name: source.name ?? '', type: source.type ?? 'salary',
            amount: String(source.amount ?? ''), frequency: source.frequency ?? 'monthly',
            expected_day: String(source.expected_day ?? ''), is_active: source.is_active ?? true,
        });
    }

    const set = (k: string, v: string | boolean) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/income-sources/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/income'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/income-sources/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/income'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form?.name?.toString().trim()) e.name = 'Name required';
        if (!form?.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !form) return;
        mutation.mutate({
            name: form.name, type: form.type,
            amount: parseFloat(form.amount as string),
            frequency: form.frequency, is_active: form.is_active,
            expected_day: form.expected_day ? parseInt(form.expected_day as string) : undefined,
        });
    };

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Income Source" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Income Source" />
            <FormLayout title="Edit Income Source" subtitle="Update income details" backHref="/income" onSave={handleSave} saving={mutation.isPending}>
                <FormSection title="Income Type">
                    <div className="grid grid-cols-4 gap-2">
                        {TYPES.map(t => (
                            <button key={t} type="button" onClick={() => set('type', t)}
                                className={cn('rounded-xl border py-2.5 text-xs font-medium transition-all',
                                    form.type === t ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                {TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>
                </FormSection>
                <FormSection title="Details">
                    <Field label="Source Name" required error={errors.name}>
                        <input value={form.name as string} onChange={e => set('name', e.target.value)} className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Amount (₹)" required error={errors.amount}>
                            <input type="number" value={form.amount as string} onChange={e => set('amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Frequency">
                            <select value={form.frequency as string} onChange={e => set('frequency', e.target.value)} className={inputCls}>
                                {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                            </select>
                        </Field>
                    </FormRow>
                    {['monthly','biweekly'].includes(form.frequency as string) && (
                        <Field label="Expected Credit Day (1–31)">
                            <input type="number" min={1} max={31} value={form.expected_day as string}
                                onChange={e => set('expected_day', e.target.value)} className={inputCls} />
                        </Field>
                    )}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => set('is_active', !form.is_active)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-emerald-500' : 'bg-white/15'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm text-white/70">{form.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                </FormSection>
                <DeleteSection label="Income Source" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
