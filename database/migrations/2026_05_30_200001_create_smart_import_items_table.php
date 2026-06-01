<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('smart_import_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('smart_import_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['expense', 'income', 'investment', 'transfer'])->default('expense');
            $table->decimal('amount', 14, 2);
            $table->string('description');
            $table->string('merchant')->nullable();
            $table->date('transaction_date')->nullable();
            $table->string('suggested_category')->nullable(); // slug e.g. food_dining
            $table->string('payment_method')->nullable();     // upi, card, cash, netbanking
            $table->decimal('confidence', 4, 3)->nullable();  // 0.000–1.000
            $table->enum('status', ['pending', 'confirmed', 'dismissed'])->default('pending');
            $table->unsignedBigInteger('confirmed_record_id')->nullable(); // FK to expense/income etc.
            $table->string('confirmed_record_type')->nullable();            // App\Models\Expense etc.
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_import_items');
    }
};
