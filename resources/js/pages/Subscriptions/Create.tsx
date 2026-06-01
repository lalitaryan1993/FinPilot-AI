import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const CATEGORIES = ['entertainment','productivity','health','finance','education','shopping','cloud','other'];
const CAT_LABELS: Record<string, string> = {
    entertainment: 'Entertainment', productivity: 'Productivity', health: 'Health',
    finance: 'Finance', education: 'Education', shopping: 'Shopping', cloud: 'Cloud', other: 'Other',
};
const CYCLES = ['daily','weekly','monthly','quarterly','annually'];
const CYCLE_LABELS: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual',
};

export default function SubscriptionsCreate() {
    const [form, setForm] = useState({
        name: '', provider: '', category: 'entertainment',
        amount: '', billing_cycle: 'monthly',
        next_billing_date: '', usage_score: '5', cancel_url: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/subscriptions', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/subscriptions'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name required';
        if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount required';
        if (!form.next_billing_date) e.next_billing_date = 'Next billing date required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate({
            name: form.name, category: form.category,
            amount: parseFloat(form.amount),
            billing_cycle: form.billing_cycle,
            next_billing_date: form.next_billing_date,
            usage_score: parseInt(form.usage_score),
            provider: form.provider || undefined,
            cancel_url: form.cancel_url || undefined,
        });
    };

    return (
        <>
            <Head title="Add Subscription" />
            <FormLayout title="Add Subscription" subtitle="Track a recurring payment" backHref="/subscriptions" onSave={handleSave} saving={mutation.isPending} saveLabel="Add Subscription">
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
                <FormSection title="Subscription Details">
                    <FormRow>
                        <Field label="Name" required error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="e.g. Netflix, Notion" className={inputCls} />
                        </Field>
                        <Field label="Provider" hint="Company name (optional)">
                            <input value={form.provider} onChange={e => set('provider', e.target.value)}
                                placeholder="e.g. Netflix Inc" className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Amount (₹)" required error={errors.amount}>
                            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                                placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Billing Cycle">
                            <select value={form.billing_cycle} onChange={e => set('billing_cycle', e.target.value)} className={inputCls}>
                                {CYCLES.map(c => <option key={c} value={c}>{CYCLE_LABELS[c]}</option>)}
                            </select>
                        </Field>
                    </FormRow>
                    <Field label="Next Billing Date" required error={errors.next_billing_date}>
                        <input type="date" value={form.next_billing_date} onChange={e => set('next_billing_date', e.target.value)} className={inputCls} />
                    </Field>
                </FormSection>
                <FormSection title="Usage & Cancel">
                    <Field label={`Usage Score: ${form.usage_score}/10`} hint="How often do you use this?">
                        <input type="range" min={1} max={10} value={form.usage_score}
                            onChange={e => set('usage_score', e.target.value)} className="w-full accent-blue-500" />
                        <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>Rarely</span><span>Daily</span>
                        </div>
                    </Field>
                    <Field label="Cancel URL (optional)" hint="Direct link to cancel this subscription">
                        <input type="url" value={form.cancel_url} onChange={e => set('cancel_url', e.target.value)}
                            placeholder="https://..." className={inputCls} />
                    </Field>
                </FormSection>
            </FormLayout>
        </>
    );
}
