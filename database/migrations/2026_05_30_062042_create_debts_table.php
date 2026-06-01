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
        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['home_loan', 'car_loan', 'personal_loan', 'education_loan', 'credit_card', 'bnpl', 'family_loan', 'other']);
            $table->string('lender')->nullable();
            $table->decimal('principal_amount', 15, 2);
            $table->decimal('current_balance', 15, 2);
            $table->decimal('interest_rate', 6, 3)->comment('Annual %');
            $table->decimal('emi_amount', 15, 2)->nullable();
            $table->tinyInteger('emi_due_day')->nullable();
            $table->date('disbursed_at')->nullable();
            $table->smallInteger('tenure_months')->nullable();
            $table->decimal('foreclosure_penalty', 6, 3)->nullable();
            $table->enum('strategy', ['snowball', 'avalanche', 'none'])->default('none');
            $table->enum('status', ['active', 'closed', 'defaulted'])->default('active');
            $table->date('closed_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debts');
    }
};
