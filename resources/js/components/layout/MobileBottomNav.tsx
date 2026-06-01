import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Receipt, Wallet, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    onMenuClick: () => void;
}

const items = [
    { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses',  icon: Receipt },
    { href: '/budget',   label: 'Budget',    icon: Wallet },
    { href: '/ai',       label: 'AI Chat',   icon: MessageSquare },
];

export function MobileBottomNav({ onMenuClick }: Props) {
    const { url } = usePage();

    const isActive = (href: string) =>
        href === '/' ? url === '/' : url.startsWith(href);

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/8 bg-[#0A1628]/96 backdrop-blur-xl safe-area-bottom">
            <div className="flex items-stretch">
                {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                                active ? 'text-blue-400' : 'text-white/35 hover:text-white/70',
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
                <button
                    onClick={onMenuClick}
                    className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-white/35 hover:text-white/70 transition-colors"
                >
                    <Menu className="h-5 w-5" />
                    More
                </button>
            </div>
        </nav>
    );
}
