<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('account_name');
            $table->string('bank_name');
            $table->enum('account_type', ['savings', 'current', 'credit_card', 'wallet', 'fd']);
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('currency', 3)->default('INR');
            $table->string('account_number', 10)->nullable();
            $table->string('color', 7)->default('#3B82F6');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }
    public function down(): void { Schema::dropIfExists('bank_accounts'); }
};
