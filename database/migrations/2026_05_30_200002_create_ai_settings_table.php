<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key');                      // e.g. 'anthropic.api_key', 'default.chat', 'agent.budget.enabled'
            $table->text('value')->nullable();          // encrypted for api keys
            $table->boolean('is_encrypted')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
