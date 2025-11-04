/**
 * Tauri commands for cleanup operations
 *
 * Exposes cleanup functionality to the frontend
 */

use crate::db::user::open_user_db;
use crate::services::cleanup::{cleanup_old_sessions, CleanupStats};

/// Run cleanup to delete old sessions based on retention period
#[tauri::command]
pub async fn run_cleanup(
    app_handle: tauri::AppHandle,
    retention_days: i64,
) -> Result<CleanupStats, String> {
    println!("[run_cleanup] Starting cleanup with retention_days: {}", retention_days);

    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    cleanup_old_sessions(&pool, retention_days)
        .await
        .map_err(|e| {
            eprintln!("[run_cleanup] Cleanup failed: {}", e);
            format!("Cleanup failed: {}", e)
        })
}
