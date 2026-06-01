import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { Investment, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const STATUS_OPTIONS = [
    { value: 'active',   label: 'Active' },
    { value: 'paused',   label: 'Paused' },
    { value: 'redeemed', label: 'Redeemed' },
];

interface Props extends PageProps { id: number; }

export default function InvestmentsEdit({ id }: Props) {
    const { data: inv, isLoading } = useQuery<Investment>({
        queryKey: ['investment', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/investments/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const [form, setForm] = useState<Record<string, string | boolean> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (inv && !form) {
        setForm({
            name:          inv.name ?? '',
            current_price: String(inv.current_price ?? ''),
            current_value: String(inv.current_value ?? ''),
            units:         String(inv.units ?? ''),
            sip_amount:    String(inv.sip_amount ?? ''),
            sip_day:       String(inv.sip_day ?? ''),
            status:        inv.status ?? 'active',
            maturity_at:   inv.maturity_at ?? '',
            is_sip:        inv.is_sip ?? false,
        });
    }

    const set = (k: string, v: string | boolean) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/investments/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/investments'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/investments/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/investments'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form?.name?.toString().trim()) e.name = 'Name required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !form) return;
        const payload: Record<string, unknown> = {
            name: form.name, status: form.status,
        };
        if (form.current_price) payload.current_price = parseFloat(form.current_price as string);
        if (form.current_value) payload.current_value = parseFloat(form.current_value as string);
        if (form.units) payload.units = parseFloat(form.units as string);
        if (form.sip_amount) payload.sip_amount = parseFloat(form.sip_amount as string);
        if (form.sip_day) payload.sip_day = parseInt(form.sip_day as string);
        if (form.maturity_at) payload.maturity_at = form.maturity_at;
        mutation.mutate(payload);
    };

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Investment" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Investment" />
            <FormLayout title="Edit Investment" subtitle="Update holding details and current price" backHref="/investments" onSave={handleSave} saving={mutation.isPending}>
                <FormSection title="Holding Details">
                    <Field label="Name" required error={errors.name}>
                        <input value={form.name as string} onChange={e => set('name', e.target.value)} className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Current Price (₹)" hint="Latest NAV or CMP">
                            <input type="number" step="0.01" value={form.current_price as string} onChange={e => set('current_price', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Current Value (₹)" hint="Override computed value">
                            <input type="number" value={form.current_value as string} onChange={e => set('current_value', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Units / Quantity">
                            <input type="number" step="0.000001" value={form.units as string} onChange={e => set('units', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Maturity Date">
                            <input type="date" value={form.maturity_at as string} onChange={e => set('maturity_at', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>

                {form.is_sip && (
                    <FormSection title="SIP Details">
                        <FormRow>
                            <Field label="SIP Amount (₹/month)">
                                <input type="number" value={form.sip_amount as string} onChange={e => set('sip_amount', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="SIP Debit Day">
                                <input type="number" min={1} max={31} value={form.sip_day as string} onChange={e => set('sip_day', e.target.value)} className={inputCls} />
                            </Field>
                        </FormRow>
                    </FormSection>
                )}

                <FormSection title="Status">
                    <Field label="Investment Status">
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
                <DeleteSection label="Investment" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
