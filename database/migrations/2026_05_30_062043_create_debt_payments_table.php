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
        Schema::create('debt_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('debt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->decimal('principal_component', 15, 2)->nullable();
            $table->decimal('interest_component', 15, 2)->nullable();
            $table->enum('type', ['emi', 'prepayment', 'part_payment', 'full_payment'])->default('emi');
            $table->date('paid_at');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('debt_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debt_payments');
    }
};
