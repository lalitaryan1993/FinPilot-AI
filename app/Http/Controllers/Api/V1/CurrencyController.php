<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CurrencyController extends Controller
{
    // Approximate rates: 1 INR = X [currency] (mid-2025 approximation)
    private const RATES = [
        'INR' => 1,
        'USD' => 0.01196,  // 1 USD ≈ ₹83.6
        'EUR' => 0.01099,  // 1 EUR ≈ ₹91.0
        'GBP' => 0.00946,  // 1 GBP ≈ ₹105.7
        'JPY' => 1.8450,   // 1 JPY ≈ ₹0.54
        'AUD' => 0.01842,  // 1 AUD ≈ ₹54.3
        'CAD' => 0.01629,  // 1 CAD ≈ ₹61.4
        'SGD' => 0.01610,  // 1 SGD ≈ ₹62.1
        'AED' => 0.04393,  // 1 AED ≈ ₹22.8
        'CHF' => 0.01064,  // 1 CHF ≈ ₹94.0
        'CNY' => 0.08680,  // 1 CNY ≈ ₹11.5
    ];

    public const SUPPORTED = [
        ['code' => 'INR', 'label' => 'Indian Rupee',      'symbol' => '₹', 'locale' => 'en-IN'],
        ['code' => 'USD', 'label' => 'US Dollar',         'symbol' => '$', 'locale' => 'en-US'],
        ['code' => 'EUR', 'label' => 'Euro',              'symbol' => '€', 'locale' => 'de-DE'],
        ['code' => 'GBP', 'label' => 'British Pound',    'symbol' => '£', 'locale' => 'en-GB'],
        ['code' => 'JPY', 'label' => 'Japanese Yen',     'symbol' => '¥', 'locale' => 'ja-JP'],
        ['code' => 'AUD', 'label' => 'Australian Dollar','symbol' => 'A$','locale' => 'en-AU'],
        ['code' => 'CAD', 'label' => 'Canadian Dollar',  'symbol' => 'C$','locale' => 'en-CA'],
        ['code' => 'SGD', 'label' => 'Singapore Dollar', 'symbol' => 'S$','locale' => 'en-SG'],
        ['code' => 'AED', 'label' => 'UAE Dirham',       'symbol' => 'د.إ','locale' => 'ar-AE'],
        ['code' => 'CHF', 'label' => 'Swiss Franc',      'symbol' => 'Fr.','locale' => 'de-CH'],
    ];

    public function rates(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'base'      => 'INR',
                'rates'     => self::RATES,
                'supported' => self::SUPPORTED,
                'updated'   => now()->toDateString(),
            ],
        ]);
    }
}
