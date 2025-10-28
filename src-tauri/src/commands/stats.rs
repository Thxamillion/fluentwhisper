/**
 * Tauri commands for stats and analytics
 */

use crate::db::user::open_user_db;
use crate::services::stats::{
    get_daily_session_counts, get_overall_stats, get_top_words, get_vocab_growth, get_wpm_trends,
    DailySessionCount, OverallStats, TopWord, VocabGrowth, WpmTrend,
};

/// Get overall statistics
#[tauri::command]
pub async fn get_stats_overall(language: Option<String>) -> Result<OverallStats, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_overall_stats(&pool, language.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get top N most practiced words
#[tauri::command]
pub async fn get_stats_top_words(
    language: String,
    limit: i64,
) -> Result<Vec<TopWord>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_top_words(&pool, &language, limit)
        .await
        .map_err(|e| e.to_string())
}

/// Get daily session counts for calendar/streaks
#[tauri::command]
pub async fn get_stats_daily_sessions(
    language: Option<String>,
    days: Option<i64>,
) -> Result<Vec<DailySessionCount>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_daily_session_counts(&pool, language.as_deref(), days)
        .await
        .map_err(|e| e.to_string())
}

/// Get WPM trends over time
#[tauri::command]
pub async fn get_stats_wpm_trends(
    language: Option<String>,
    days: Option<i64>,
) -> Result<Vec<WpmTrend>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_wpm_trends(&pool, language.as_deref(), days)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary growth over time
#[tauri::command]
pub async fn get_stats_vocab_growth(language: String) -> Result<Vec<VocabGrowth>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_vocab_growth(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}
