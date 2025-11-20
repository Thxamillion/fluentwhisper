/**
 * Tauri commands for vocabulary operations
 * Exposes vocabulary service to the frontend
 */

use crate::db::user::open_user_db;
use crate::services::vocabulary::{self, VocabStats, VocabWord, VocabWordWithTranslation};

/// Record a word in user's vocabulary
/// Returns true if word is new, false if already existed
#[tauri::command]
pub async fn record_word(app_handle: tauri::AppHandle, 
    lemma: String,
    language: String,
    form_spoken: String,
) -> Result<bool, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::record_word(&pool, &lemma, &language, &form_spoken)
        .await
        .map_err(|e| e.to_string())
}

/// Get all vocabulary for a language
#[tauri::command]
pub async fn get_user_vocab(app_handle: tauri::AppHandle, language: String) -> Result<Vec<VocabWord>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::get_user_vocab(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Check if a word is new (not in vocabulary)
#[tauri::command]
pub async fn is_new_word(app_handle: tauri::AppHandle, lemma: String, language: String) -> Result<bool, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::is_new_word(&pool, &lemma, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary statistics for a language
#[tauri::command]
pub async fn get_vocab_stats(app_handle: tauri::AppHandle, language: String) -> Result<VocabStats, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::get_vocab_stats(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Clean up vocabulary lemmas by removing punctuation
/// Returns the number of lemmas cleaned
#[tauri::command]
pub async fn clean_vocab_punctuation(app_handle: tauri::AppHandle, ) -> Result<i32, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::clean_punctuation(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get recently learned vocabulary with translations
#[tauri::command]
pub async fn get_recent_vocab(
    app_handle: tauri::AppHandle,
    language: String,
    primary_language: String,
    days: i32,
    limit: i32,
) -> Result<Vec<VocabWordWithTranslation>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::get_recent_vocab(&pool, &app_handle, &language, &primary_language, days, limit)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a word from user's vocabulary
#[tauri::command]
pub async fn delete_vocab_word(
    app_handle: tauri::AppHandle,
    lemma: String,
    language: String,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::delete_word(&pool, &lemma, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Toggle mastered status for a word
/// Returns the new mastered status (true if now mastered, false if unmarked)
#[tauri::command]
pub async fn toggle_vocab_mastered(
    app_handle: tauri::AppHandle,
    lemma: String,
    language: String,
) -> Result<bool, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::toggle_mastered(&pool, &lemma, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Set a custom translation for a word
#[tauri::command]
pub async fn set_custom_translation(
    app_handle: tauri::AppHandle,
    lemma: String,
    lang_from: String,
    lang_to: String,
    custom_translation: String,
    notes: Option<String>,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::set_custom_translation(&pool, &lemma, &lang_from, &lang_to, &custom_translation, notes.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get a custom translation if it exists
#[tauri::command]
pub async fn get_custom_translation(
    app_handle: tauri::AppHandle,
    lemma: String,
    lang_from: String,
    lang_to: String,
) -> Result<Option<String>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::get_custom_translation(&pool, &lemma, &lang_from, &lang_to)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a custom translation (reset to default)
#[tauri::command]
pub async fn delete_custom_translation(
    app_handle: tauri::AppHandle,
    lemma: String,
    lang_from: String,
    lang_to: String,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::delete_custom_translation(&pool, &lemma, &lang_from, &lang_to)
        .await
        .map_err(|e| e.to_string())
}

/// Fix vocabulary entries by re-lemmatizing inflected forms
/// Returns the number of entries fixed
#[tauri::command]
pub async fn fix_vocab_lemmas(
    app_handle: tauri::AppHandle,
    language: String,
) -> Result<i32, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::fix_vocab_lemmas(&pool, &language, &app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// Add a tag to a word
/// Returns the updated tags array
#[tauri::command]
pub async fn add_vocab_tag(
    app_handle: tauri::AppHandle,
    lemma: String,
    language: String,
    tag: String,
) -> Result<Vec<String>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::add_tag(&pool, &lemma, &language, &tag)
        .await
        .map_err(|e| e.to_string())
}

/// Remove a tag from a word
/// Returns the updated tags array
#[tauri::command]
pub async fn remove_vocab_tag(
    app_handle: tauri::AppHandle,
    lemma: String,
    language: String,
    tag: String,
) -> Result<Vec<String>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::remove_tag(&pool, &lemma, &language, &tag)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary filtered by tag
#[tauri::command]
pub async fn get_vocab_by_tag(
    app_handle: tauri::AppHandle,
    language: String,
    tag: String,
) -> Result<Vec<VocabWord>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    vocabulary::get_vocab_by_tag(&pool, &language, &tag)
        .await
        .map_err(|e| e.to_string())
}
