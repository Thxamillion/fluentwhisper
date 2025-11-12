/**
 * Tauri commands for dictionary operations
 * Exposes dictionary management to the frontend
 */

use crate::db::user::open_user_db;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Dictionary {
    pub id: i64,
    pub language: String,
    pub name: String,
    pub url_template: String,
    pub dict_type: String,
    pub is_active: i64,
    pub sort_order: i64,
    pub is_default: i64,
    pub created_at: i64,
}

/// Get all dictionaries for a language
#[tauri::command]
pub async fn get_dictionaries(
    app_handle: tauri::AppHandle,
    language: String,
) -> Result<Vec<Dictionary>, String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    let dictionaries = sqlx::query_as::<_, Dictionary>(
        r#"
        SELECT id, language, name, url_template, dict_type, is_active, sort_order, is_default, created_at
        FROM dictionaries
        WHERE language = ?
        ORDER BY sort_order ASC
        "#,
    )
    .bind(&language)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(dictionaries)
}

/// Update dictionary active status
#[tauri::command]
pub async fn update_dictionary_active(
    app_handle: tauri::AppHandle,
    id: i64,
    is_active: bool,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE dictionaries
        SET is_active = ?
        WHERE id = ?
        "#,
    )
    .bind(if is_active { 1 } else { 0 })
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Update dictionary sort order
#[tauri::command]
pub async fn update_dictionary_sort_order(
    app_handle: tauri::AppHandle,
    id: i64,
    sort_order: i64,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE dictionaries
        SET sort_order = ?
        WHERE id = ?
        "#,
    )
    .bind(sort_order)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Reorder dictionaries for a language
/// Takes a list of dictionary IDs in desired order
#[tauri::command]
pub async fn reorder_dictionaries(
    app_handle: tauri::AppHandle,
    dictionary_ids: Vec<i64>,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    // Update sort_order for each dictionary
    for (index, id) in dictionary_ids.iter().enumerate() {
        sqlx::query(
            r#"
            UPDATE dictionaries
            SET sort_order = ?
            WHERE id = ?
            "#,
        )
        .bind((index + 1) as i64)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Add a custom dictionary
#[tauri::command]
pub async fn add_dictionary(
    app_handle: tauri::AppHandle,
    language: String,
    name: String,
    url_template: String,
    dict_type: String,
) -> Result<i64, String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    // Validate dict_type
    if dict_type != "embedded" && dict_type != "popup" {
        return Err("dict_type must be 'embedded' or 'popup'".to_string());
    }

    // Get the next sort_order for this language
    let max_sort: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT MAX(sort_order)
        FROM dictionaries
        WHERE language = ?
        "#,
    )
    .bind(&language)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let next_sort = max_sort.unwrap_or(0) + 1;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let result = sqlx::query(
        r#"
        INSERT INTO dictionaries (language, name, url_template, dict_type, is_active, sort_order, is_default, created_at)
        VALUES (?, ?, ?, ?, 1, ?, 0, ?)
        "#,
    )
    .bind(&language)
    .bind(&name)
    .bind(&url_template)
    .bind(&dict_type)
    .bind(next_sort)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.last_insert_rowid())
}

/// Delete a custom dictionary
/// Only allows deleting non-default dictionaries
#[tauri::command]
pub async fn delete_dictionary(
    app_handle: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let pool = open_user_db(&app_handle)
        .await
        .map_err(|e| e.to_string())?;

    // Check if it's a default dictionary
    let is_default: i64 = sqlx::query_scalar(
        r#"
        SELECT is_default
        FROM dictionaries
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if is_default == 1 {
        return Err("Cannot delete default dictionaries".to_string());
    }

    sqlx::query(
        r#"
        DELETE FROM dictionaries
        WHERE id = ?
        "#,
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
