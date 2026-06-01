import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Home, Car, Plane, GraduationCap, HeartHandshake, PiggyBank, Briefcase, Flag } from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, DeleteSection, inputCls } from '@/components/layout/FormLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import type { Goal, PageProps } from '@/types';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const GOAL_TYPES = [
    { value: 'emergency_fund', label: 'Emergency Fund', icon: ShieldCheck, color: '#10B981' },
    { value: 'home_purchase',  label: 'Home',           icon: Home,        color: '#3B82F6' },
    { value: 'vehicle',        label: 'Vehicle',        icon: Car,         color: '#F59E0B' },
    { value: 'travel',         label: 'Travel',         icon: Plane,       color: '#06B6D4' },
    { value: 'education',      label: 'Education',      icon: GraduationCap, color: '#8B5CF6' },
    { value: 'wedding',        label: 'Wedding',        icon: HeartHandshake, color: '#EC4899' },
    { value: 'retirement',     label: 'Retirement',     icon: PiggyBank,   color: '#F97316' },
    { value: 'business',       label: 'Business',       icon: Briefcase,   color: '#14B8A6' },
    { value: 'other',          label: 'Other',          icon: Flag,        color: '#6B7280' },
];

const STATUS_OPTIONS = [
    { value: 'active',    label: 'Active' },
    { value: 'paused',    label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
];

interface Props extends PageProps { id: number; }

export default function GoalsEdit({ id }: Props) {
    const { data: goal, isLoading } = useQuery<Goal>({
        queryKey: ['goal', id],
        queryFn: async () => {
            const r = await fetch(`/api/v1/goals/${id}`, { credentials: 'include' });
            return (await r.json()).data;
        },
    });

    const [form, setForm] = useState<Record<string, string> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (goal && !form) {
        setForm({
            type:           goal.type ?? 'other',
            name:           goal.name ?? '',
            target_amount:  String(goal.target_amount ?? ''),
            monthly_target: String(goal.monthly_target ?? ''),
            target_date:    goal.target_date ?? '',
            priority:       String(goal.priority ?? 5),
            status:         goal.status ?? 'active',
        });
    }

    const set = (k: string, v: string) => setForm(f => f ? { ...f, [k]: v } : null);

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch(`/api/v1/goals/${id}`, {
                method: 'PUT', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/goals'),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/v1/goals/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': csrf() } });
            return r.json();
        },
        onSuccess: () => router.visit('/goals'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form?.name?.trim()) e.name = 'Name required';
        if (!form?.target_amount || isNaN(Number(form.target_amount))) e.target_amount = 'Valid amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !form) return;
        mutation.mutate({
            type:           form.type,
            name:           form.name,
            target_amount:  parseFloat(form.target_amount),
            monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : undefined,
            target_date:    form.target_date || undefined,
            priority:       parseInt(form.priority) || 5,
            status:         form.status,
        });
    };

    if (isLoading || !form) {
        return (
            <AppLayout>
                <Head title="Edit Goal" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={24} className="animate-spin text-white/30" />
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Edit Goal" />
            <FormLayout title="Edit Goal" subtitle="Update your savings goal" backHref="/goals" onSave={handleSave} saving={mutation.isPending}>
                <FormSection title="Goal Type">
                    <div className="grid grid-cols-3 gap-2">
                        {GOAL_TYPES.map(t => {
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
                <FormSection title="Goal Details">
                    <Field label="Goal Name" required error={errors.name}>
                        <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Target Amount (₹)" required error={errors.target_amount}>
                            <input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Monthly SIP (₹)">
                            <input type="number" value={form.monthly_target} onChange={e => set('monthly_target', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                    <FormRow>
                        <Field label="Target Date">
                            <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Priority (1 = highest)">
                            <input type="number" min={1} max={10} value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>
                <FormSection title="Status">
                    <Field label="Goal Status">
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
                <DeleteSection label="Goal" onDelete={() => deleteMutation.mutate()} deleting={deleteMutation.isPending} />
            </FormLayout>
        </>
    );
}
