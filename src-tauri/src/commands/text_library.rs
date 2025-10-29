/**
 * Tauri commands for text library management
 */

use crate::db::user::open_user_db;
use crate::services::text_library::{
    create_text_library_item, delete_text_library_item, get_all_text_library_items,
    get_text_library_by_language, get_text_library_item, update_text_library_item,
    CreateTextLibraryItem, TextLibraryItem, UpdateTextLibraryItem,
};

/// Create a new text library item
#[tauri::command]
pub async fn create_text_library_item_command(app_handle: tauri::AppHandle, 
    item: CreateTextLibraryItem,
) -> Result<TextLibraryItem, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    create_text_library_item(&pool, item)
        .await
        .map_err(|e| e.to_string())
}

/// Get a single text library item by ID
#[tauri::command]
pub async fn get_text_library_item_command(app_handle: tauri::AppHandle, id: String) -> Result<TextLibraryItem, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_text_library_item(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

/// Get all text library items
#[tauri::command]
pub async fn get_all_text_library_items_command(app_handle: tauri::AppHandle, ) -> Result<Vec<TextLibraryItem>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_all_text_library_items(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get text library items filtered by language
#[tauri::command]
pub async fn get_text_library_by_language_command(app_handle: tauri::AppHandle, 
    language: String,
) -> Result<Vec<TextLibraryItem>, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    get_text_library_by_language(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Update a text library item
#[tauri::command]
pub async fn update_text_library_item_command(app_handle: tauri::AppHandle, 
    id: String,
    updates: UpdateTextLibraryItem,
) -> Result<TextLibraryItem, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    update_text_library_item(&pool, &id, updates)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a text library item
#[tauri::command]
pub async fn delete_text_library_item_command(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    delete_text_library_item(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}
