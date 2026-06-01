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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['bank_statement', 'credit_card_statement', 'salary_slip', 'receipt', 'invoice', 'investment_statement', 'tax_document', 'other']);
            $table->string('file_path');
            $table->integer('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->enum('ocr_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->longText('ocr_text')->nullable();
            $table->enum('extraction_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->json('extracted_data')->nullable();
            $table->integer('transactions_imported')->default(0);
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
