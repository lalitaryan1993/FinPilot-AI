import { useState, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Bot, User, Sparkles, TrendingDown,
    Target, PiggyBank, BarChart3, Loader2, ShieldAlert, LineChart, Copy, Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    context?: string;
}

type ChatContext = 'general' | 'budget' | 'debt' | 'goal' | 'savings' | 'analytics' | 'fraud';

const contextOptions: { value: ChatContext; label: string; icon: typeof Bot; color: string }[] = [
    { value: 'general',   label: 'General Finance', icon: Bot,         color: '#3B82F6' },
    { value: 'budget',    label: 'Budget Help',     icon: BarChart3,   color: '#10B981' },
    { value: 'debt',      label: 'Debt Strategy',   icon: TrendingDown,color: '#EF4444' },
    { value: 'goal',      label: 'Goal Planning',   icon: Target,      color: '#F5C842' },
    { value: 'savings',   label: 'Save More',       icon: PiggyBank,   color: '#8B5CF6' },
    { value: 'analytics', label: 'Deep Analytics',  icon: LineChart,   color: '#06B6D4' },
    { value: 'fraud',     label: 'Fraud Check',     icon: ShieldAlert, color: '#F97316' },
];

const starterPromptsByContext: Record<string, string[]> = {
    general:   ['How can I save ₹5,000 more per month?', 'Give me a full financial health check', 'What are my biggest money mistakes?', 'Create a 12-month financial plan for me'],
    budget:    ['Analyze my budget and find problem areas', 'Suggest a 50/30/20 budget for my income', 'Which budget categories am I overspending?', 'How can I cut ₹3,000 from my monthly expenses?'],
    debt:      ['Create a debt payoff plan for me', 'Should I use avalanche or snowball method?', 'How can I reduce my EMI burden?', 'When will I be debt free at my current pace?'],
    goal:      ['How much should my emergency fund be?', 'What SIP amount do I need to reach my goal?', 'Am I on track for my savings goals?', 'Help me plan for a home purchase in 5 years'],
    savings:   ['Where can I cut expenses this month?', 'How much can I realistically save monthly?', 'Best ways to save on everyday Indian expenses?', 'Help me build an emergency fund in 6 months'],
    analytics: ['Show me my spending trends for the last 6 months', 'What are my seasonal spending patterns?', 'Compare my this month vs last month spending', 'Forecast my savings for next year'],
    fraud:     ['Are there any suspicious transactions in my history?', 'Check for duplicate charges in my expenses', 'Which subscriptions am I paying for but not using?', 'Flag any unusual spending patterns'],
};

function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 px-1 py-2">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-blue-400"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </div>
    );
}

function MarkdownMessage({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-white/80">{children}</em>,
                ul: ({ children }) => <ul className="mb-2 ml-4 space-y-1 list-disc marker:text-blue-400">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 space-y-1 list-decimal marker:text-blue-400">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="mb-2 text-base font-bold text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-1.5 text-sm font-bold text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold text-white/90">{children}</h3>,
                code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                        <code className="block mt-2 mb-2 rounded-lg bg-black/30 px-3 py-2 text-xs font-mono text-blue-300 whitespace-pre-wrap border border-white/8">
                            {children}
                        </code>
                    ) : (
                        <code className="rounded px-1.5 py-0.5 bg-white/10 text-xs font-mono text-blue-300">{children}</code>
                    );
                },
                blockquote: ({ children }) => (
                    <blockquote className="mb-2 border-l-2 border-blue-500/50 pl-3 text-white/60 italic">{children}</blockquote>
                ),
                hr: () => <hr className="my-3 border-white/10" />,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                        {children}
                    </a>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60"
        >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput]       = useState('');
    const [context, setContext]   = useState<ChatContext>('general');
    const [streaming, setStreaming] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    const sendMessage = async (text?: string) => {
        const content = (text ?? input).trim();
        if (!content || streaming) return;

        setInput('');

        const userMsg: Message = {
            id:        Date.now().toString(),
            role:      'user',
            content,
            timestamp: new Date(),
            context,
        };

        setMessages((prev) => [...prev, userMsg]);
        setStreaming(true);

        const assistantId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ]);

        try {
            const history = messages.slice(-10).map((m) => ({
                role: m.role, content: m.content,
            }));

            const res = await fetch('/api/v1/ai/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept':       'text/event-stream',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
                body: JSON.stringify({ message: content, context, history }),
            });

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        accumulated += parsed.content ?? '';
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, content: accumulated } : m,
                            ),
                        );
                    } catch {
                        // ignore parse errors on partial chunks
                    }
                }
            }
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
                        : m,
                ),
            );
        } finally {
            setStreaming(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const activeCtx = contextOptions.find((c) => c.value === context)!;
    const currentStarters = starterPromptsByContext[context] ?? starterPromptsByContext.general;;

    return (
        <AppLayout title="AI Chat">
            <Head title="AI Chat" />

            <div className="flex h-[calc(100vh-56px)] flex-col">
                {/* Context selector */}
                <div className="flex gap-2 border-b border-white/8 px-4 py-3 overflow-x-auto">
                    {contextOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setContext(opt.value)}
                            className={cn(
                                'flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                                context === opt.value
                                    ? 'text-white border'
                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                            )}
                            style={context === opt.value ? {
                                background: `${opt.color}18`,
                                borderColor: `${opt.color}40`,
                                color: opt.color,
                            } : undefined}
                        >
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/20">
                                <Sparkles className="h-7 w-7 text-blue-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white mb-1">FinPilot AI</h2>
                            <p className="text-sm text-white/40 mb-6 max-w-sm">
                                Your personal financial co-pilot. Ask me anything about your money.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                {currentStarters.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => sendMessage(p)}
                                        className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-white/60 hover:border-blue-500/30 hover:bg-blue-500/8 hover:text-white/80 transition-all"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-3xl space-y-5">
                            <AnimatePresence initial={false}>
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className={cn('flex gap-3 group', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="flex h-8 w-8 flex-shrink-0 mt-0.5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/25">
                                                <Bot className="h-4 w-4 text-blue-400" />
                                            </div>
                                        )}

                                        <div className={cn('flex flex-col', msg.role === 'user' ? 'items-end max-w-[75%]' : 'items-start max-w-[85%]')}>
                                            <div
                                                className={cn(
                                                    'rounded-2xl px-4 py-3 text-sm',
                                                    msg.role === 'user'
                                                        ? 'chat-user text-white rounded-tr-sm'
                                                        : 'chat-ai text-white/85 rounded-tl-sm',
                                                )}
                                            >
                                                {msg.role === 'assistant'
                                                    ? (msg.content
                                                        ? <MarkdownMessage content={msg.content} />
                                                        : <TypingIndicator />)
                                                    : <p className="leading-relaxed">{msg.content}</p>
                                                }
                                            </div>
                                            {msg.role === 'assistant' && msg.content && (
                                                <CopyButton text={msg.content} />
                                            )}
                                        </div>

                                        {msg.role === 'user' && (
                                            <div className="flex h-8 w-8 flex-shrink-0 mt-0.5 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/25">
                                                <User className="h-4 w-4 text-blue-400" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-white/8 bg-[#0A1628]/80 px-4 py-4 backdrop-blur-xl">
                    <div className="mx-auto max-w-3xl">
                        <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 focus-within:border-blue-500/40 transition-colors">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask about ${activeCtx.label.toLowerCase()}…`}
                                rows={1}
                                className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                                style={{ maxHeight: '120px', overflowY: 'auto' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || streaming}
                                className={cn(
                                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all',
                                    input.trim() && !streaming
                                        ? 'bg-blue-500 text-white hover:bg-blue-400'
                                        : 'bg-white/8 text-white/30 cursor-not-allowed',
                                )}
                            >
                                {streaming
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Send className="h-4 w-4" />
                                }
                            </button>
                        </div>
                        <div className="mt-2 text-center text-[10px] text-white/20">
                            FinPilot AI · Educational purposes only · Not financial advice
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
