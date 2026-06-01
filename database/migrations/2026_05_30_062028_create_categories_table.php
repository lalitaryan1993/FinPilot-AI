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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name', 100);
            $table->string('slug', 100);
            $table->string('icon', 50)->nullable();
            $table->char('color', 7)->nullable();
            $table->enum('type', ['expense', 'income', 'transfer'])->default('expense');
            $table->boolean('is_system')->default(false);
            $table->json('ai_keywords')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index('user_id');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
