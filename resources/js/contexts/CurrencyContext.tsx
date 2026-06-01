import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

interface CurrencyRates {
    [code: string]: number;
}

interface CurrencyContextValue {
    currency: string;
    rate: number;
    convert: (amountInr: number) => number;
    fmt: (amountInr: number) => string;
    fmtCompact: (amountInr: number) => string;
}

const SYMBOLS: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£',
    JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ', CHF: 'Fr.',
};

const LOCALES: Record<string, string> = {
    INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
    JPY: 'ja-JP', AUD: 'en-AU', CAD: 'en-CA', SGD: 'en-SG', CHF: 'de-CH',
};

const defaultValue: CurrencyContextValue = {
    currency:   'INR',
    rate:        1,
    convert:    (n) => n,
    fmt:        (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n),
    fmtCompact: (n) => {
        if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
        if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
        if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    },
};

const CurrencyContext = createContext<CurrencyContextValue>(defaultValue);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const { auth } = usePage<PageProps>().props;
    const currency = auth?.user?.currency ?? 'INR';

    const [rates, setRates] = useState<CurrencyRates>({ INR: 1 });

    useEffect(() => {
        fetch('/api/v1/currency/rates')
            .then((r) => r.json())
            .then((j) => { if (j?.data?.rates) setRates(j.data.rates); })
            .catch(() => {});
    }, []);

    const rate    = rates[currency] ?? 1;
    const locale  = LOCALES[currency] ?? 'en-US';
    const symbol  = SYMBOLS[currency] ?? currency;
    const isJpy   = currency === 'JPY';

    const convert = (amountInr: number) => amountInr * rate;

    const fmt = (amountInr: number) =>
        new Intl.NumberFormat(locale, {
            style:              'currency',
            currency,
            maximumFractionDigits: isJpy ? 0 : 0,
        }).format(convert(amountInr));

    const fmtCompact = (amountInr: number): string => {
        const converted = convert(amountInr);
        if (currency === 'INR') {
            if (amountInr >= 10_000_000) return `₹${(amountInr / 10_000_000).toFixed(1)}Cr`;
            if (amountInr >= 100_000)    return `₹${(amountInr / 100_000).toFixed(1)}L`;
            if (amountInr >= 1_000)      return `₹${(amountInr / 1_000).toFixed(1)}K`;
            return fmt(amountInr);
        }
        if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
        if (converted >= 1_000)     return `${symbol}${(converted / 1_000).toFixed(1)}K`;
        return fmt(amountInr);
    };

    return (
        <CurrencyContext.Provider value={{ currency, rate, convert, fmt, fmtCompact }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export const useCurrency = () => useContext(CurrencyContext);
