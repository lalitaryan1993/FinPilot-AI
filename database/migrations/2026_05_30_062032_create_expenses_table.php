<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->constrained();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description', 500);
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('INR');
            $table->decimal('base_amount', 15, 2)->nullable()->comment('INR equivalent');
            $table->decimal('exchange_rate', 10, 6)->default(1.000000);
            $table->date('expense_date');
            $table->enum('payment_method', ['cash', 'upi', 'card', 'netbanking', 'wallet', 'cheque', 'auto_debit', 'other'])->nullable();
            $table->string('merchant')->nullable();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            $table->string('receipt_path')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->foreignId('recurring_id')->nullable()->constrained('expenses')->nullOnDelete();
            $table->enum('source', ['manual', 'ocr', 'bank_import', 'ai_extracted', 'api'])->default('manual');
            $table->decimal('ai_confidence', 5, 4)->nullable();
            $table->boolean('is_split')->default(false);
            $table->string('split_group_id', 36)->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['user_id', 'expense_date']);
            $table->index('category_id');
            $table->index('amount');
            $table->fullText(['description', 'merchant']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
