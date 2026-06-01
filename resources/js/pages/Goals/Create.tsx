import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import {
    ShieldCheck, Home, Car, Plane, GraduationCap,
    HeartHandshake, PiggyBank, Briefcase, Flag,
} from 'lucide-react';
import { FormLayout, FormSection, FormRow, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const GOAL_TYPES = [
    { value: 'emergency_fund',   label: 'Emergency Fund',  icon: ShieldCheck, color: '#10B981' },
    { value: 'home_purchase',    label: 'Home',            icon: Home,        color: '#3B82F6' },
    { value: 'vehicle',          label: 'Vehicle',         icon: Car,         color: '#F59E0B' },
    { value: 'travel',           label: 'Travel',          icon: Plane,       color: '#06B6D4' },
    { value: 'education',        label: 'Education',       icon: GraduationCap, color: '#8B5CF6' },
    { value: 'wedding',          label: 'Wedding',         icon: HeartHandshake, color: '#EC4899' },
    { value: 'retirement',       label: 'Retirement',      icon: PiggyBank,   color: '#F97316' },
    { value: 'business',         label: 'Business',        icon: Briefcase,   color: '#14B8A6' },
    { value: 'other',            label: 'Other',           icon: Flag,        color: '#6B7280' },
];

export default function GoalsCreate() {
    const [form, setForm] = useState({
        type:           'emergency_fund',
        name:           '',
        target_amount:  '',
        monthly_target: '',
        target_date:    '',
        priority:       '5',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const selectedType = GOAL_TYPES.find(t => t.value === form.type);

    // SIP estimate: months to reach target
    const sipMonths = form.target_amount && form.monthly_target
        ? Math.ceil(parseFloat(form.target_amount) / parseFloat(form.monthly_target))
        : null;

    const mutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const r = await fetch('/api/v1/goals', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Failed');
        },
        onSuccess: () => router.visit('/goals'),
    });

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Goal name is required';
        if (!form.target_amount || isNaN(Number(form.target_amount))) e.target_amount = 'Target amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate({
            type:           form.type,
            name:           form.name,
            target_amount:  parseFloat(form.target_amount),
            monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : undefined,
            target_date:    form.target_date || undefined,
            priority:       parseInt(form.priority) || 5,
        });
    };

    return (
        <>
            <Head title="New Goal" />
            <FormLayout title="Create Goal" subtitle="Define what you're saving towards" backHref="/goals" onSave={handleSave} saving={mutation.isPending} saveLabel="Create Goal">

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
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder={`e.g. ${selectedType?.label ?? 'My Goal'}`} className={inputCls} />
                    </Field>
                    <FormRow>
                        <Field label="Target Amount (₹)" required error={errors.target_amount}>
                            <input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)}
                                placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Monthly SIP (₹)" hint="How much you plan to save each month">
                            <input type="number" value={form.monthly_target} onChange={e => set('monthly_target', e.target.value)}
                                placeholder="0" className={inputCls} />
                        </Field>
                    </FormRow>
                    {sipMonths && (
                        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-xs text-white/60">
                            At <span className="text-white font-semibold">₹{Number(form.monthly_target).toLocaleString('en-IN')}/mo</span>, you'll reach this goal in{' '}
                            <span className="text-white font-semibold">{sipMonths} months</span>{' '}
                            ({Math.ceil(sipMonths / 12)} yr{sipMonths > 24 ? 's' : ''}).
                        </div>
                    )}
                    <FormRow>
                        <Field label="Target Date" hint="Optional deadline">
                            <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Priority (1 = highest)" hint="Determines sort order">
                            <input type="number" min={1} max={10} value={form.priority}
                                onChange={e => set('priority', e.target.value)} className={inputCls} />
                        </Field>
                    </FormRow>
                </FormSection>
            </FormLayout>
        </>
    );
}
