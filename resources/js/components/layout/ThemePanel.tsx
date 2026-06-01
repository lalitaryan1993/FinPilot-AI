import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useTheme,
    THEME_BASES, THEME_ACCENTS,
    type ThemeBase, type ThemeAccent, type ThemeDensity, type SidebarStyle,
} from '@/contexts/ThemeContext';

// Gradient swatches for each base theme
const BASE_GRADIENTS: Record<ThemeBase, string> = {
    navy:     'linear-gradient(135deg, #0A1628 0%, #1E3A5F 50%, #0F1F3D 100%)',
    midnight: 'linear-gradient(135deg, #050A0E 0%, #131C27 50%, #0D1117 100%)',
    purple:   'linear-gradient(135deg, #0C0917 0%, #2D1B69 50%, #160F2E 100%)',
    emerald:  'linear-gradient(135deg, #071A12 0%, #064E3B 50%, #0D2B1C 100%)',
    rose:     'linear-gradient(135deg, #180A10 0%, #4C0519 50%, #2A0F1A 100%)',
    slate:    'linear-gradient(135deg, #0A0F1A 0%, #1E293B 50%, #131B2E 100%)',
};

// Gradient previews for accent colors
const ACCENT_GRADIENTS: Record<ThemeAccent, string> = {
    gold:    'linear-gradient(135deg, #F5C842, #EAB308)',
    blue:    'linear-gradient(135deg, #60A5FA, #3B82F6)',
    emerald: 'linear-gradient(135deg, #34D399, #10B981)',
    purple:  'linear-gradient(135deg, #A78BFA, #8B5CF6)',
    rose:    'linear-gradient(135deg, #FB7185, #F43F5E)',
    cyan:    'linear-gradient(135deg, #22D3EE, #06B6D4)',
};

const ACCENT_GLOW: Record<ThemeAccent, string> = {
    gold:    'shadow-[0_0_16px_rgba(245,200,66,0.5)]',
    blue:    'shadow-[0_0_16px_rgba(59,130,246,0.5)]',
    emerald: 'shadow-[0_0_16px_rgba(16,185,129,0.5)]',
    purple:  'shadow-[0_0_16px_rgba(139,92,246,0.5)]',
    rose:    'shadow-[0_0_16px_rgba(244,63,94,0.5)]',
    cyan:    'shadow-[0_0_16px_rgba(6,182,212,0.5)]',
};

interface Props {
    open: boolean;
    onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">
            {children}
        </p>
    );
}

export function ThemePanel({ open, onClose }: Props) {
    const { theme, setBase, setAccent, setDensity, setSidebar, reset } = useTheme();

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.aside
                        className="fixed right-0 top-0 z-[100] flex h-full w-80 flex-col border-l border-white/10 bg-[#0C0F1A]/98 shadow-2xl backdrop-blur-2xl"
                        initial={{ x: '100%' }}
                        animate={{ x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } }}
                        exit={{ x: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                                    <Palette className="h-3.5 w-3.5 text-white/60" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Appearance</p>
                                    <p className="text-[10px] text-white/35">Customize your workspace</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

                            {/* ── Base Theme ── */}
                            <div>
                                <SectionLabel>Base Theme</SectionLabel>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {THEME_BASES.map((t) => {
                                        const active = theme.base === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setBase(t.id as ThemeBase)}
                                                className={cn(
                                                    'group relative overflow-hidden rounded-xl border p-0 transition-all',
                                                    active
                                                        ? 'border-white/40 ring-1 ring-white/20'
                                                        : 'border-white/10 hover:border-white/25',
                                                )}
                                                title={t.label}
                                            >
                                                {/* Gradient preview */}
                                                <div
                                                    className="h-14 w-full"
                                                    style={{ background: BASE_GRADIENTS[t.id as ThemeBase] }}
                                                />
                                                {/* Label bar */}
                                                <div className="border-t border-white/8 bg-white/4 px-2 py-1.5">
                                                    <p className="text-center text-[10px] font-medium text-white/60">
                                                        {t.label}
                                                    </p>
                                                </div>
                                                {/* Active check */}
                                                {active && (
                                                    <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/90">
                                                        <Check className="h-2.5 w-2.5 text-black" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Accent Color ── */}
                            <div>
                                <SectionLabel>Accent Color</SectionLabel>
                                <div className="grid grid-cols-6 gap-2">
                                    {THEME_ACCENTS.map((a) => {
                                        const active = theme.accent === a.id;
                                        return (
                                            <button
                                                key={a.id}
                                                onClick={() => setAccent(a.id as ThemeAccent)}
                                                title={a.label}
                                                className={cn(
                                                    'group relative flex h-10 w-full items-center justify-center rounded-xl transition-all',
                                                    active
                                                        ? ACCENT_GLOW[a.id as ThemeAccent]
                                                        : 'hover:scale-110',
                                                )}
                                                style={{ background: ACCENT_GRADIENTS[a.id as ThemeAccent] }}
                                            >
                                                {active && (
                                                    <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Accent label */}
                                <p className="mt-2 text-center text-xs text-white/35">
                                    {THEME_ACCENTS.find((a) => a.id === theme.accent)?.label} accent
                                </p>
                            </div>

                            {/* ── Sidebar Style ── */}
                            <div>
                                <SectionLabel>Sidebar Style</SectionLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['glass', 'solid'] as SidebarStyle[]).map((s) => {
                                        const active = theme.sidebar === s;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setSidebar(s)}
                                                className={cn(
                                                    'relative overflow-hidden rounded-xl border p-3 text-left transition-all',
                                                    active
                                                        ? 'border-white/30 bg-white/8'
                                                        : 'border-white/8 bg-white/3 hover:border-white/20',
                                                )}
                                            >
                                                {/* Mini sidebar preview */}
                                                <div className={cn(
                                                    'mb-2 h-10 rounded-lg',
                                                    s === 'glass' ? 'bg-white/5 backdrop-blur border border-white/10' : 'bg-white/12',
                                                )}>
                                                    <div className="p-1.5 space-y-1">
                                                        {[40, 60, 45].map((w, i) => (
                                                            <div key={i} className="h-1 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className={cn('text-xs font-medium capitalize', active ? 'text-white' : 'text-white/50')}>
                                                    {s}
                                                </p>
                                                {active && (
                                                    <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/90">
                                                        <Check className="h-2.5 w-2.5 text-black" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Layout Density ── */}
                            <div>
                                <SectionLabel>Layout Density</SectionLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { id: 'comfortable', label: 'Comfortable', lines: [24, 12, 12] },
                                        { id: 'compact',     label: 'Compact',     lines: [18, 10, 10] },
                                    ] as { id: ThemeDensity; label: string; lines: number[] }[]).map((d) => {
                                        const active = theme.density === d.id;
                                        return (
                                            <button
                                                key={d.id}
                                                onClick={() => setDensity(d.id)}
                                                className={cn(
                                                    'relative overflow-hidden rounded-xl border p-3 text-left transition-all',
                                                    active
                                                        ? 'border-white/30 bg-white/8'
                                                        : 'border-white/8 bg-white/3 hover:border-white/20',
                                                )}
                                            >
                                                <div className="mb-2 space-y-1.5">
                                                    {d.lines.map((h, i) => (
                                                        <div
                                                            key={i}
                                                            className="rounded-full bg-white/15"
                                                            style={{ height: `${h / 12}rem`, width: i === 0 ? '70%' : '50%' }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className={cn('text-xs font-medium', active ? 'text-white' : 'text-white/50')}>
                                                    {d.label}
                                                </p>
                                                {active && (
                                                    <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/90">
                                                        <Check className="h-2.5 w-2.5 text-black" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Gradient Preview ── */}
                            <div>
                                <SectionLabel>Current Palette Preview</SectionLabel>
                                <div className="overflow-hidden rounded-xl border border-white/10">
                                    {/* Simulated dashboard card */}
                                    <div
                                        className="p-4"
                                        style={{ background: THEME_BASES.find(b => b.id === theme.base)?.surface }}
                                    >
                                        <p className="mb-3 text-xs font-semibold text-white/50">Monthly Income</p>
                                        <p
                                            className="text-xl font-bold tabular-nums"
                                            style={{ color: THEME_ACCENTS.find(a => a.id === theme.accent)?.color }}
                                        >
                                            ₹1,00,000
                                        </p>
                                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: '72%',
                                                    background: ACCENT_GRADIENTS[theme.accent],
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Simulated sidebar */}
                                    <div
                                        className="border-t border-white/8 px-3 py-2 flex items-center gap-2"
                                        style={{ background: THEME_BASES.find(b => b.id === theme.base)?.bg }}
                                    >
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ background: ACCENT_GRADIENTS[theme.accent] }}
                                        />
                                        <div className="h-2 w-16 rounded-full bg-white/15" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/8 px-5 py-4">
                            <button
                                onClick={reset}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-white/50 transition-all hover:border-white/20 hover:text-white"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset to defaults
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
