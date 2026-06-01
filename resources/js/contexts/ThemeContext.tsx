import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeBase   = 'navy' | 'midnight' | 'purple' | 'emerald' | 'rose' | 'slate';
export type ThemeAccent = 'gold' | 'blue' | 'emerald' | 'purple' | 'rose' | 'cyan';
export type ThemeDensity = 'comfortable' | 'compact';
export type SidebarStyle = 'glass' | 'solid';

export interface ThemeConfig {
    base:     ThemeBase;
    accent:   ThemeAccent;
    density:  ThemeDensity;
    sidebar:  SidebarStyle;
}

export const THEME_BASES: { id: ThemeBase; label: string; bg: string; surface: string }[] = [
    { id: 'navy',     label: 'Navy',     bg: '#0A1628', surface: '#0F1F3D' },
    { id: 'midnight', label: 'Midnight', bg: '#050A0E', surface: '#0D1117' },
    { id: 'purple',   label: 'Purple',   bg: '#0C0917', surface: '#160F2E' },
    { id: 'emerald',  label: 'Emerald',  bg: '#071A12', surface: '#0D2B1C' },
    { id: 'rose',     label: 'Rose',     bg: '#180A10', surface: '#2A0F1A' },
    { id: 'slate',    label: 'Slate',    bg: '#0A0F1A', surface: '#131B2E' },
];

export const THEME_ACCENTS: { id: ThemeAccent; label: string; color: string }[] = [
    { id: 'gold',    label: 'Gold',    color: '#F5C842' },
    { id: 'blue',    label: 'Blue',    color: '#3B82F6' },
    { id: 'emerald', label: 'Emerald', color: '#10B981' },
    { id: 'purple',  label: 'Purple',  color: '#8B5CF6' },
    { id: 'rose',    label: 'Rose',    color: '#F43F5E' },
    { id: 'cyan',    label: 'Cyan',    color: '#06B6D4' },
];

const DEFAULTS: ThemeConfig = {
    base:    'navy',
    accent:  'gold',
    density: 'comfortable',
    sidebar: 'glass',
};

function load(): ThemeConfig {
    try {
        const raw = localStorage.getItem('fp-theme');
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULTS;
}

function apply(cfg: ThemeConfig) {
    const el = document.documentElement;
    el.setAttribute('data-theme',   cfg.base);
    el.setAttribute('data-accent',  cfg.accent);
    el.setAttribute('data-density', cfg.density);
    el.style.setProperty('--fp-bg', THEME_BASES.find((b) => b.id === cfg.base)?.bg ?? '#0A1628');
    // body background follows theme
    document.body.style.backgroundColor = THEME_BASES.find((b) => b.id === cfg.base)?.bg ?? '#0A1628';
}

interface ThemeContextValue {
    theme:     ThemeConfig;
    setBase:   (v: ThemeBase)    => void;
    setAccent: (v: ThemeAccent)  => void;
    setDensity:(v: ThemeDensity) => void;
    setSidebar:(v: SidebarStyle) => void;
    reset:     () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeConfig>(load);

    useEffect(() => {
        apply(theme);
        localStorage.setItem('fp-theme', JSON.stringify(theme));
    }, [theme]);

    const update = (patch: Partial<ThemeConfig>) =>
        setTheme((t) => ({ ...t, ...patch }));

    return (
        <ThemeContext.Provider value={{
            theme,
            setBase:    (base)    => update({ base }),
            setAccent:  (accent)  => update({ accent }),
            setDensity: (density) => update({ density }),
            setSidebar: (sidebar) => update({ sidebar }),
            reset:      ()        => setTheme(DEFAULTS),
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
    return ctx;
}
