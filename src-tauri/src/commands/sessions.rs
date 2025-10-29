/**
 * Tauri commands for session management
 */

use crate::db::user::open_user_db;
use crate::services::sessions::{delete_session, get_all_sessions, get_session, get_sessions_by_language, get_session_words, SessionData, SessionWord};

/// Get all sessions (all languages)
#[tauri::command]
pub async fn get_all_sessions_command(app_handle: tauri::AppHandle) -> Result<Vec<SessionData>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_all_sessions(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get a single session by ID
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_session_command(app_handle: tauri::AppHandle, sessionId: String) -> Result<SessionData, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_session(&pool, &sessionId)
        .await
        .map_err(|e| e.to_string())
}

/// Get sessions filtered by language
#[tauri::command]
pub async fn get_sessions_by_language_command(app_handle: tauri::AppHandle, language: String) -> Result<Vec<SessionData>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_sessions_by_language(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Get vocabulary words for a session
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_session_words_command(app_handle: tauri::AppHandle, sessionId: String) -> Result<Vec<SessionWord>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_session_words(&pool, &sessionId)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a session and its related data
#[tauri::command]
#[allow(non_snake_case)]
pub async fn delete_session_command(app_handle: tauri::AppHandle, sessionId: String) -> Result<(), String> {
    println!("[delete_session_command] Received request to delete session: {}", sessionId);
    let pool = open_user_db(&app_handle).await.map_err(|e| {
        println!("[delete_session_command] Failed to open DB: {}", e);
        e.to_string()
    })?;
    println!("[delete_session_command] DB opened, calling delete_session service");
    delete_session(&pool, &sessionId)
        .await
        .map_err(|e| {
            println!("[delete_session_command] Delete failed with error: {}", e);
            e.to_string()
        })?;
    println!("[delete_session_command] Delete completed successfully");
    Ok(())
}
