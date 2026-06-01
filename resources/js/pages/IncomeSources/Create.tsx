import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

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

export default function IncomeSourcesCreate() {
    const [form, setForm] = useState({
        name: '', type: 'salary', amount: '',
        frequency: 'monthly', expected_day: '', is_active: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/income-sources', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/income'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name required';
        if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate({
            name: form.name, type: form.type,
            amount: parseFloat(form.amount),
            frequency: form.frequency,
            is_active: form.is_active,
            expected_day: form.expected_day ? parseInt(form.expected_day) : undefined,
        });
    };

    return (
        <>
            <Head title="Add Income Source" />
            <FormLayout title="Add Income Source" subtitle="Track a new income stream" backHref="/income" onSave={handleSave} saving={mutation.isPending} saveLabel="Add Source">
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
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g. TCS Salary, Flat 2B Rent" className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Amount (₹)" required error={errors.amount}>
                            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                                placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Frequency">
                            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
                                {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                            </select>
                        </Field>
                    </FormRow>
                    {['monthly','biweekly'].includes(form.frequency) && (
                        <Field label="Expected Credit Day (1–31)" hint="Day of month when income arrives">
                            <input type="number" min={1} max={31} value={form.expected_day}
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
            </FormLayout>
        </>
    );
}
