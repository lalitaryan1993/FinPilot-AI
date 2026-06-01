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
        Schema::create('financial_health_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('score_month')->comment('First day of month');
            $table->tinyInteger('total_score')->comment('0-100');
            $table->tinyInteger('savings_score');
            $table->tinyInteger('debt_score');
            $table->tinyInteger('emergency_score');
            $table->tinyInteger('goal_score');
            $table->tinyInteger('budget_score');
            $table->decimal('savings_rate', 6, 3)->nullable();
            $table->decimal('debt_ratio', 6, 3)->nullable();
            $table->decimal('emergency_months', 5, 2)->nullable();
            $table->json('insights')->nullable();
            $table->timestamp('calculated_at')->useCurrent();
            $table->unique(['user_id', 'score_month']);
            $table->index(['user_id', 'score_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_health_scores');
    }
};
