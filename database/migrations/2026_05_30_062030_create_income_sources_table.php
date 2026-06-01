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
        Schema::create('income_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['salary', 'freelance', 'rental', 'dividends', 'business', 'pension', 'side_hustle', 'other']);
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('INR');
            $table->enum('frequency', ['one_time', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually']);
            $table->tinyInteger('expected_day')->nullable()->comment('Day of month salary is expected');
            $table->enum('tax_category', ['salaried', 'self_employed', 'business', 'other'])->default('salaried');
            $table->boolean('is_active')->default(true);
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('income_sources');
    }
};
