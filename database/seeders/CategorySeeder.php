<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // === EXPENSE CATEGORIES ===
            ['name' => 'Housing',        'icon' => 'home',           'color' => '#3B82F6', 'type' => 'expense', 'keywords' => ['rent', 'maintenance', 'society', 'apartment', 'flat']],
            ['name' => 'Groceries',      'icon' => 'shopping-basket','color' => '#10B981', 'type' => 'expense', 'keywords' => ['grocery', 'vegetables', 'fruits', 'supermarket', 'dmart', 'bigbasket', 'zepto']],
            ['name' => 'Dining Out',     'icon' => 'utensils',       'color' => '#F59E0B', 'type' => 'expense', 'keywords' => ['restaurant', 'cafe', 'swiggy', 'zomato', 'food', 'hotel', 'dhaba']],
            ['name' => 'Transport',      'icon' => 'car',            'color' => '#8B5CF6', 'type' => 'expense', 'keywords' => ['fuel', 'petrol', 'diesel', 'ola', 'uber', 'auto', 'bus', 'metro', 'rapido']],
            ['name' => 'Healthcare',     'icon' => 'activity',       'color' => '#EF4444', 'type' => 'expense', 'keywords' => ['doctor', 'hospital', 'medicine', 'pharmacy', 'medical', 'apollo', 'practo']],
            ['name' => 'Utilities',      'icon' => 'zap',            'color' => '#06B6D4', 'type' => 'expense', 'keywords' => ['electricity', 'water', 'gas', 'internet', 'mobile', 'recharge', 'broadband']],
            ['name' => 'Shopping',       'icon' => 'shopping-bag',   'color' => '#EC4899', 'type' => 'expense', 'keywords' => ['amazon', 'flipkart', 'clothes', 'shoes', 'myntra', 'meesho', 'shopping']],
            ['name' => 'Entertainment', 'icon' => 'film',            'color' => '#A78BFA', 'type' => 'expense', 'keywords' => ['netflix', 'hotstar', 'movie', 'cinema', 'prime', 'spotify', 'youtube']],
            ['name' => 'Education',      'icon' => 'book-open',      'color' => '#0EA5E9', 'type' => 'expense', 'keywords' => ['school', 'college', 'tuition', 'course', 'udemy', 'books', 'fees']],
            ['name' => 'Personal Care',  'icon' => 'scissors',       'color' => '#F472B6', 'type' => 'expense', 'keywords' => ['salon', 'spa', 'cosmetics', 'beauty', 'haircut', 'gym']],
            ['name' => 'EMI / Loans',    'icon' => 'credit-card',    'color' => '#EF4444', 'type' => 'expense', 'keywords' => ['emi', 'loan', 'repayment', 'installment']],
            ['name' => 'Insurance',      'icon' => 'shield',         'color' => '#64748B', 'type' => 'expense', 'keywords' => ['insurance', 'premium', 'lic', 'health insurance']],
            ['name' => 'Investments',    'icon' => 'trending-up',    'color' => '#10B981', 'type' => 'expense', 'keywords' => ['sip', 'mutual fund', 'stocks', 'ppf', 'fd', 'nps', 'investment']],
            ['name' => 'Family',         'icon' => 'users',          'color' => '#F59E0B', 'type' => 'expense', 'keywords' => ['family', 'parents', 'children', 'kids', 'relatives']],
            ['name' => 'Travel',         'icon' => 'plane',          'color' => '#3B82F6', 'type' => 'expense', 'keywords' => ['flight', 'hotel', 'irctc', 'trip', 'holiday', 'makemytrip', 'goibibo']],
            ['name' => 'Subscriptions',  'icon' => 'repeat',         'color' => '#8B5CF6', 'type' => 'expense', 'keywords' => ['subscription', 'monthly plan', 'annual', 'membership']],
            ['name' => 'Gifts & Charity','icon' => 'gift',           'color' => '#EC4899', 'type' => 'expense', 'keywords' => ['gift', 'donation', 'charity', 'ngo']],
            ['name' => 'Taxes',          'icon' => 'file-text',      'color' => '#64748B', 'type' => 'expense', 'keywords' => ['income tax', 'gst', 'tds', 'advance tax']],
            ['name' => 'Miscellaneous',  'icon' => 'more-horizontal', 'color' => '#94A3B8','type' => 'expense', 'keywords' => []],

            // === INCOME CATEGORIES ===
            ['name' => 'Salary',         'icon' => 'briefcase',      'color' => '#10B981', 'type' => 'income', 'keywords' => ['salary', 'ctc', 'payroll', 'wages']],
            ['name' => 'Freelance',      'icon' => 'laptop',         'color' => '#3B82F6', 'type' => 'income', 'keywords' => ['freelance', 'consulting', 'project', 'gig']],
            ['name' => 'Business',       'icon' => 'building-2',     'color' => '#F59E0B', 'type' => 'income', 'keywords' => ['business', 'revenue', 'sales', 'profit']],
            ['name' => 'Investment Returns','icon'=>'trending-up',   'color' => '#8B5CF6', 'type' => 'income', 'keywords' => ['dividend', 'interest', 'returns', 'profit', 'capital gain']],
            ['name' => 'Rental Income',  'icon' => 'home',           'color' => '#06B6D4', 'type' => 'income', 'keywords' => ['rent', 'rental', 'tenant', 'property']],
            ['name' => 'Other Income',   'icon' => 'plus-circle',    'color' => '#94A3B8', 'type' => 'income', 'keywords' => []],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(
                ['slug' => Str::slug($cat['name']), 'user_id' => null],
                [
                    'name'        => $cat['name'],
                    'slug'        => Str::slug($cat['name']),
                    'icon'        => $cat['icon'],
                    'color'       => $cat['color'],
                    'type'        => $cat['type'],
                    'is_system'   => true,
                    'ai_keywords' => $cat['keywords'],
                    'sort_order'  => 0,
                ]
            );
        }
    }
}
