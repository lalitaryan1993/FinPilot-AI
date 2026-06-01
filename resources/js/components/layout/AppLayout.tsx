import { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';
import { usePage } from '@inertiajs/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import type { PageProps } from '@/types';

interface Props extends PropsWithChildren {
    title?: string;
}

export function AppLayout({ children, title }: Props) {
    const { auth } = usePage<PageProps>().props;

    return (
        <ThemeProvider>
        <CurrencyProvider>
            <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--fp-bg, #0A1628)' }}>
                <Sidebar user={auth.user} />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <TopBar title={title} user={auth.user} />

                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>

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
