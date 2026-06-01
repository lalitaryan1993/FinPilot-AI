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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->char('currency', 3)->default('INR')->after('phone');
            $table->string('locale', 10)->default('en_IN')->after('currency');
            $table->string('timezone', 50)->default('Asia/Kolkata')->after('locale');
            $table->string('avatar_path')->nullable()->after('timezone');
            $table->tinyInteger('onboarding_step')->default(0)->after('avatar_path');
            $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete()->after('onboarding_step');
            $table->boolean('is_active')->default(true)->after('family_id');
            $table->json('notification_preferences')->nullable()->after('is_active');
            $table->json('ai_preferences')->nullable()->after('notification_preferences');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'currency', 'locale', 'timezone', 'avatar_path',
                'onboarding_step', 'family_id', 'is_active',
                'notification_preferences', 'ai_preferences', 'deleted_at',
            ]);
        });
    }
};
