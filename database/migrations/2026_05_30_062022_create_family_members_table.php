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
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['admin', 'co_admin', 'member', 'viewer'])->default('member');
            $table->string('display_name')->nullable();
            $table->enum('relation', ['spouse', 'child', 'parent', 'sibling', 'other'])->nullable();
            $table->decimal('spending_limit', 15, 2)->nullable();
            $table->timestamp('joined_at')->useCurrent();
            $table->unique(['family_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('family_members');
    }
};
