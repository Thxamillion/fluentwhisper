/**
 * Tauri commands for vocabulary operations
 * Exposes vocabulary service to the frontend
 */

use crate::db::user::open_user_db;
use crate::services::vocabulary::{self, VocabStats, VocabWord};

/// Record a word in user's vocabulary
/// Returns true if word is new, false if already existed
#[tauri::command]
pub async fn record_word(
    lemma: String,
    language: String,
    form_spoken: String,
) -> Result<bool, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;

    vocabulary::record_word(&pool, &lemma, &language, &form_spoken)
        .await
        .map_err(|e| e.to_string())
}

/// Get all vocabulary for a language
#[tauri::command]
pub async fn get_user_vocab(language: String) -> Result<Vec<VocabWord>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;

    vocabulary::get_user_vocab(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Check if a word is new (not in vocabulary)
#[tauri::command]
pub async fn is_new_word(lemma: String, language: String) -> Result<bool, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;

    vocabulary::is_new_word(&pool, &lemma, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary statistics for a language
#[tauri::command]
pub async fn get_vocab_stats(language: String) -> Result<VocabStats, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;

    vocabulary::get_vocab_stats(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}
