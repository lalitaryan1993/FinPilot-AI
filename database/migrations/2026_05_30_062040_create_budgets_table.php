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
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->decimal('amount', 15, 2);
            $table->decimal('spent_amount', 15, 2)->default(0);
            $table->enum('period', ['monthly', 'weekly', 'quarterly', 'annual', 'custom'])->default('monthly');
            $table->date('period_start');
            $table->date('period_end');
            $table->boolean('rollover')->default(false);
            $table->tinyInteger('alert_at_percent')->default(80);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['user_id', 'period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
