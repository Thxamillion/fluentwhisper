/**
 * Tauri commands for session management
 */

use crate::db::user::open_user_db;
use crate::services::sessions::{delete_session, get_all_sessions, get_session, get_sessions_by_language, get_session_words, SessionData, SessionWord};

/// Get all sessions (all languages)
#[tauri::command]
pub async fn get_all_sessions_command() -> Result<Vec<SessionData>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_all_sessions(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get a single session by ID
#[tauri::command]
pub async fn get_session_command(session_id: String) -> Result<SessionData, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_session(&pool, &session_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get sessions filtered by language
#[tauri::command]
pub async fn get_sessions_by_language_command(language: String) -> Result<Vec<SessionData>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_sessions_by_language(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary words for a session
#[tauri::command]
pub async fn get_session_words_command(session_id: String) -> Result<Vec<SessionWord>, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    get_session_words(&pool, &session_id)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a session and its related data
#[tauri::command]
pub async fn delete_session_command(session_id: String) -> Result<(), String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    delete_session(&pool, &session_id)
        .await
        .map_err(|e| e.to_string())
}
