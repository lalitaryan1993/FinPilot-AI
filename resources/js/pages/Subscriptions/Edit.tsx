import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { Subscription, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
const CATEGORIES = ['entertainment','productivity','health','finance','education','shopping','cloud','other'];
const CAT_LABELS: Record<string, string> = {
    entertainment:'Entertainment',productivity:'Productivity',health:'Health',
    finance:'Finance',education:'Education',shopping:'Shopping',cloud:'Cloud',other:'Other',
};
const CYCLES = ['daily','weekly','monthly','quarterly','annually'];
const CYCLE_LABELS: Record<string, string> = {
    daily:'Daily',weekly:'Weekly',monthly:'Monthly',quarterly:'Quarterly',annually:'Annual',
};

interface Props extends PageProps { id: number; }

export default function SubscriptionsEdit({ id }: Props) {
    const { data: sub, isLoading } = useQuery<Subscription>({
        queryKey: ['subscription', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/subscriptions/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const [form, setForm] = useState<Record<string, string> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (sub && !form) {
        setForm({
            name: sub.name ?? '', provider: sub.provider ?? '',
            category: sub.category ?? 'entertainment',
            amount: String(sub.amount ?? ''), billing_cycle: sub.billing_cycle ?? 'monthly',
            next_billing_date: sub.next_billing_date ?? '',
            usage_score: String(sub.usage_score ?? 5),
            cancel_url: sub.cancel_url ?? '',
        });
    }

    const set = (k: string, v: string) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/subscriptions/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/subscriptions'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/subscriptions/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/subscriptions'),
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
            name: form.name, category: form.category,
            amount: parseFloat(form.amount),
            billing_cycle: form.billing_cycle,
            next_billing_date: form.next_billing_date,
            usage_score: parseInt(form.usage_score),
            cancel_url: form.cancel_url || undefined,
        });
    };

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Subscription" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Subscription" />
            <FormLayout title="Edit Subscription" subtitle="Update subscription details" backHref="/subscriptions" onSave={handleSave} saving={mutation.isPending}>
                <FormSection title="Category">
                    <div className="grid grid-cols-4 gap-2">
                        {CATEGORIES.map(c => (
                            <button key={c} type="button" onClick={() => set('category', c)}
                                className={cn('rounded-xl border py-2.5 text-xs font-medium transition-all',
                                    form.category === c ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                {CAT_LABELS[c]}
                            </button>
                        ))}
                    </div>
                </FormSection>
                <FormSection title="Details">
                    <FormRow>
                        <Field label="Name" required error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Provider">
                            <input value={form.provider} onChange={e => set('provider', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Amount (₹)" required error={errors.amount}>
                            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Billing Cycle">
                            <select value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)} className={inputCls}>
                                {CYCLES.map(c => <option key={c} value={c}>{CYCLE_LABELS[c]}</option>)}
                            </select>
                        </Field>
                    </FormRow>
                    <Field label="Next Billing Date">
                        <input type="date" value={form.next_billing_date} onChange={e => set('next_billing_date', e.target.value)} className={inputCls} />
                    </Field>
                </FormSection>
                <FormSection title="Usage & Cancel">
                    <Field label={`Usage Score: ${form.usage_score}/10`}>
                        <input type="range" min={1} max={10} value={form.usage_score}
                            onChange={e => set('usage_score', e.target.value)} className="w-full accent-blue-500" />
                        <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>Rarely</span><span>Daily</span>
                        </div>
                    </Field>
                    <Field label="Cancel URL">
                        <input type="url" value={form.cancel_url} onChange={e => set('cancel_url', e.target.value)}
                            placeholder="https://..." className={inputCls} />
                    </Field>
                </FormSection>
                <DeleteSection label="Subscription" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
