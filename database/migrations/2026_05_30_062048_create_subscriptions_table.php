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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('provider')->nullable();
            $table->enum('category', ['entertainment', 'productivity', 'health', 'finance', 'education', 'shopping', 'cloud', 'other'])->default('other');
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('INR');
            $table->enum('billing_cycle', ['daily', 'weekly', 'monthly', 'quarterly', 'annually'])->default('monthly');
            $table->date('next_billing_date');
            $table->date('started_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('auto_detected')->default(false);
            $table->tinyInteger('usage_score')->nullable()->comment('1-10 how much user uses it');
            $table->string('cancel_url')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
