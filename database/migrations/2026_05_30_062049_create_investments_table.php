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
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['mutual_fund', 'stock', 'fd', 'rd', 'ppf', 'epf', 'nps', 'gold', 'real_estate', 'crypto', 'bonds', 'other']);
            $table->string('symbol')->nullable()->comment('Stock/MF symbol');
            $table->string('isin')->nullable();
            $table->decimal('units', 15, 6)->nullable();
            $table->decimal('buy_price', 15, 4)->nullable()->comment('Per unit price');
            $table->decimal('current_price', 15, 4)->nullable();
            $table->decimal('invested_amount', 15, 2);
            $table->decimal('current_value', 15, 2)->nullable();
            $table->boolean('is_sip')->default(false);
            $table->decimal('sip_amount', 15, 2)->nullable();
            $table->tinyInteger('sip_day')->nullable();
            $table->date('started_at')->nullable();
            $table->date('maturity_at')->nullable();
            $table->enum('status', ['active', 'paused', 'redeemed'])->default('active');
            $table->timestamp('price_updated_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};
