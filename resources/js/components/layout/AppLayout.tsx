import { PropsWithChildren, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { usePage } from '@inertiajs/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { CommandPalette } from './CommandPalette';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import type { PageProps } from '@/types';

interface Props extends PropsWithChildren {
    title?: string;
}

export function AppLayout({ children, title }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [commandOpen,       setCommandOpen]       = useState(false);

    // Global Ctrl+K / Cmd+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setCommandOpen(v => !v);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return (
        <ThemeProvider>
        <CurrencyProvider>
            <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--fp-bg, #0A1628)' }}>
                <Sidebar
                    user={auth.user}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />

                <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                    <TopBar
                        title={title}
                        user={auth.user}
                        onMenuClick={() => setMobileSidebarOpen(true)}
                        onSearchClick={() => setCommandOpen(true)}
                    />

                    <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
                        {children}
                    </main>
                </div>

                <MobileBottomNav onMenuClick={() => setMobileSidebarOpen(true)} />

                <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: 'rgba(15, 31, 61, 0.96)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: '#F8FAFC',
                            backdropFilter: 'blur(24px)',
                        },
                    }}
                />
            </div>
        </CurrencyProvider>
        </ThemeProvider>
    );
}
