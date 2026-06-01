<?php

namespace App\Jobs;

use App\Models\Investment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncInvestmentNavJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300;

    public function handle(): void
    {
        // Sync mutual funds via AMFI mfapi.in
        $this->syncMutualFunds();

        // Sync stocks / ETFs via a simple price lookup (symbol-based)
        $this->syncStocks();
    }

    private function syncMutualFunds(): void
    {
        $funds = Investment::where('type', 'mutual_fund')
            ->where('status', 'active')
            ->whereNotNull('isin')
            ->get();

        if ($funds->isEmpty()) return;

        // AMFI search endpoint — find scheme by ISIN
        foreach ($funds as $fund) {
            try {
                // mfapi search by ISIN
                $searchResp = Http::timeout(15)
                    ->get("https://api.mfapi.in/mf/search", ['q' => $fund->isin]);

                if (!$searchResp->successful()) continue;

                $results = $searchResp->json();
                if (empty($results)) continue;

                $schemeCode = $results[0]['schemeCode'] ?? null;
                if (!$schemeCode) continue;

                // Fetch latest NAV
                $navResp = Http::timeout(15)
                    ->get("https://api.mfapi.in/mf/{$schemeCode}/latest");

                if (!$navResp->successful()) continue;

                $data = $navResp->json('data.0');
                if (!$data) continue;

                $nav = (float) ($data['nav'] ?? 0);
                if ($nav <= 0) continue;

                $currentValue = $fund->units ? round($fund->units * $nav, 2) : null;

                $fund->update([
                    'current_price'    => $nav,
                    'current_value'    => $currentValue ?? $fund->current_value,
                    'price_updated_at' => now(),
                    'metadata'         => array_merge($fund->metadata ?? [], [
                        'scheme_code' => $schemeCode,
                        'nav_date'    => $data['date'] ?? null,
                    ]),
                ]);

            } catch (\Throwable $e) {
                Log::warning('Failed to sync NAV for fund', [
                    'investment_id' => $fund->id,
                    'isin'          => $fund->isin,
                    'error'         => $e->getMessage(),
                ]);
            }
        }
    }

    private function syncStocks(): void
    {
        $stocks = Investment::whereIn('type', ['stock', 'etf'])
            ->where('status', 'active')
            ->whereNotNull('symbol')
            ->get();

        if ($stocks->isEmpty()) return;

        foreach ($stocks as $stock) {
            try {
                // Use Yahoo Finance unofficial endpoint (no auth needed for basic quotes)
                $symbol = $stock->symbol;
                // Append .NS for NSE, .BO for BSE if not already suffixed
                if (!str_contains($symbol, '.')) {
                    $symbol .= '.NS';
                }

                $resp = Http::timeout(15)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                    ->get("https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}", [
                        'interval' => '1d',
                        'range'    => '1d',
                    ]);

                if (!$resp->successful()) continue;

                $price = $resp->json('chart.result.0.meta.regularMarketPrice');
                if (!$price) continue;

                $price       = (float) $price;
                $currentValue = $stock->units ? round($stock->units * $price, 2) : null;

                $stock->update([
                    'current_price'    => $price,
                    'current_value'    => $currentValue ?? $stock->current_value,
                    'price_updated_at' => now(),
                ]);

            } catch (\Throwable $e) {
                Log::warning('Failed to sync price for stock', [
                    'investment_id' => $stock->id,
                    'symbol'        => $stock->symbol,
                    'error'         => $e->getMessage(),
                ]);
            }
        }
    }
}
