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
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('trigger_type', ['transaction_received', 'budget_threshold', 'date_based', 'salary_credited', 'large_transaction', 'goal_reached']);
            $table->json('trigger_config');
            $table->enum('action_type', ['send_notification', 'create_budget', 'log_expense', 'goal_contribution', 'webhook', 'email']);
            $table->json('action_config');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_fired_at')->nullable();
            $table->integer('fire_count')->default(0);
            $table->timestamps();
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_rules');
    }
};
