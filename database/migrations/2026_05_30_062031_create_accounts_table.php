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
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['bank', 'wallet', 'credit_card', 'cash', 'investment', 'other'])->default('bank');
            $table->string('bank_name')->nullable();
            $table->string('account_number_last4', 4)->nullable();
            $table->char('currency', 3)->default('INR');
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('color', 7)->nullable();
            $table->string('icon', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('include_in_total')->default(true);
            $table->timestamps();
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
