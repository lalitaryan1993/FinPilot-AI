<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE automation_rules MODIFY COLUMN trigger_type VARCHAR(50) NOT NULL");
        DB::statement("ALTER TABLE automation_rules MODIFY COLUMN action_type VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        // Restore original ENUMs (only safe if no out-of-enum rows exist)
        DB::statement("ALTER TABLE automation_rules MODIFY COLUMN trigger_type ENUM('transaction_received','budget_threshold','date_based','salary_credited','large_transaction','goal_reached') NOT NULL");
        DB::statement("ALTER TABLE automation_rules MODIFY COLUMN action_type ENUM('send_notification','create_budget','log_expense','goal_contribution','webhook','email') NOT NULL");
    }
};
