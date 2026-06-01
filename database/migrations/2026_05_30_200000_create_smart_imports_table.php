<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('smart_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_name');
            $table->string('file_path');
            $table->string('file_type');         // image/pdf
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->enum('status', ['pending', 'processing', 'done', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->json('raw_ai_response')->nullable();
            $table->string('source_type')->nullable(); // upi_screenshot, bank_statement, receipt, etc.
            $table->text('ai_notes')->nullable();
            $table->unsignedSmallInteger('total_items')->default(0);
            $table->unsignedSmallInteger('confirmed_count')->default(0);
            $table->unsignedSmallInteger('dismissed_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smart_imports');
    }
};
