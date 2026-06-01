import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Insight {
    title: string;
    body: string;
    type: string;
}

interface Props { insights: Insight[] }

const typeColors: Record<string, string> = {
    savings:    '#10B981',
    budget:     '#3B82F6',
    debt:       '#EF4444',
    goal:       '#F5C842',
    investment: '#8B5CF6',
    welcome:    '#3B82F6',
    default:    '#94A3B8',
};

export function AIInsightsCarousel({ insights }: Props) {
    const [idx, setIdx]   = useState(0);
    const [dir, setDir]   = useState(1);

    if (!insights.length) return null;

    const current = insights[idx];
    const color   = typeColors[current.type] ?? typeColors.default;

    const prev = () => { setDir(-1); setIdx((i) => (i - 1 + insights.length) % insights.length); };
    const next = () => { setDir(1);  setIdx((i) => (i + 1) % insights.length); };

    return (
        <GlassCard glow="blue" className="overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                    AI Insight
                </span>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-white/30">{idx + 1}/{insights.length}</span>
                    <button onClick={prev} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/8 text-white/50 hover:text-white transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={next} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/8 text-white/50 hover:text-white transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                    key={idx}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -40 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="text-base font-semibold text-white mb-1.5" style={{ color }}>
                        {current.title}
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{current.body}</p>
                </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1">
                    {insights.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
                            className={`h-1 rounded-full transition-all ${i === idx ? 'w-5 bg-blue-400' : 'w-1.5 bg-white/20 hover:bg-white/30'}`}
                        />
                    ))}
                </div>
                <Link href="/ai" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Discuss with AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </GlassCard>
    );
}
