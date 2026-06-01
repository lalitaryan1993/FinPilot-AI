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
        Schema::create('goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->enum('type', ['emergency_fund', 'home', 'car', 'education', 'vacation', 'wedding', 'retirement', 'business', 'custom']);
            $table->decimal('target_amount', 15, 2);
            $table->decimal('current_amount', 15, 2)->default(0);
            $table->decimal('monthly_target', 15, 2)->nullable();
            $table->date('target_date')->nullable();
            $table->tinyInteger('priority')->default(5)->comment('1=highest, 10=lowest');
            $table->string('icon', 50)->nullable();
            $table->char('color', 7)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'paused', 'completed', 'abandoned'])->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->json('ai_analysis')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goals');
    }
};
