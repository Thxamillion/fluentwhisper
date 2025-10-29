/**
 * Text Library service
 *
 * Manages imported texts for read-aloud practice:
 * - Creating text library items from various sources
 * - Retrieving and filtering text library items
 * - Updating and deleting text library items
 * - Calculating text statistics (word count, estimated duration)
 */

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TextLibraryItem {
    pub id: String,
    pub title: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub content: String,
    pub language: String,
    pub word_count: Option<i64>,
    pub estimated_duration: Option<i64>,
    pub difficulty_level: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTextLibraryItem {
    pub title: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub content: String,
    pub language: String,
    pub difficulty_level: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTextLibraryItem {
    pub title: Option<String>,
    pub source_type: Option<String>,
    pub source_url: Option<String>,
    pub content: Option<String>,
    pub difficulty_level: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Calculate word count from text
fn calculate_word_count(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

/// Estimate reading duration in seconds (assumes 150 WPM average reading speed)
fn estimate_duration(word_count: i64) -> i64 {
    (word_count as f64 / 150.0 * 60.0) as i64
}

/// Create a new text library item
pub async fn create_text_library_item(
    pool: &SqlitePool,
    input: CreateTextLibraryItem,
) -> Result<TextLibraryItem> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    // Calculate stats
    let word_count = calculate_word_count(&input.content);
    let estimated_duration = estimate_duration(word_count);

    // Serialize tags to JSON
    let tags_json = input.tags.as_ref().map(|t| serde_json::to_string(t).ok()).flatten();

    sqlx::query(
        r#"
        INSERT INTO text_library (
            id, title, source_type, source_url, content, language,
            word_count, estimated_duration, difficulty_level,
            created_at, updated_at, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&input.title)
    .bind(&input.source_type)
    .bind(&input.source_url)
    .bind(&input.content)
    .bind(&input.language)
    .bind(word_count)
    .bind(estimated_duration)
    .bind(&input.difficulty_level)
    .bind(now)
    .bind(now)
    .bind(&tags_json)
    .execute(pool)
    .await
    .context("Failed to create text library item")?;

    // Fetch and return the created item
    get_text_library_item(pool, &id).await
}

/// Get a single text library item by ID
pub async fn get_text_library_item(pool: &SqlitePool, id: &str) -> Result<TextLibraryItem> {
    sqlx::query_as::<_, TextLibraryItem>(
        r#"
        SELECT id, title, source_type, source_url, content, language,
               word_count, estimated_duration, difficulty_level,
               created_at, updated_at, tags
        FROM text_library
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .context("Failed to get text library item")
}

/// Get all text library items
pub async fn get_all_text_library_items(pool: &SqlitePool) -> Result<Vec<TextLibraryItem>> {
    sqlx::query_as::<_, TextLibraryItem>(
        r#"
        SELECT id, title, source_type, source_url, content, language,
               word_count, estimated_duration, difficulty_level,
               created_at, updated_at, tags
        FROM text_library
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .context("Failed to get text library items")
}

/// Get text library items filtered by language
pub async fn get_text_library_by_language(
    pool: &SqlitePool,
    language: &str,
) -> Result<Vec<TextLibraryItem>> {
    sqlx::query_as::<_, TextLibraryItem>(
        r#"
        SELECT id, title, source_type, source_url, content, language,
               word_count, estimated_duration, difficulty_level,
               created_at, updated_at, tags
        FROM text_library
        WHERE language = ?
        ORDER BY created_at DESC
        "#,
    )
    .bind(language)
    .fetch_all(pool)
    .await
    .context("Failed to get text library items by language")
}

/// Update a text library item
pub async fn update_text_library_item(
    pool: &SqlitePool,
    id: &str,
    updates: UpdateTextLibraryItem,
) -> Result<TextLibraryItem> {
    let now = Utc::now().timestamp();

    // Get current item to build update
    let current = get_text_library_item(pool, id).await?;

    let title = updates.title.unwrap_or(current.title);
    let source_type = updates.source_type.unwrap_or(current.source_type);
    let source_url = updates.source_url.or(current.source_url);
    let content = updates.content.unwrap_or(current.content);
    let difficulty_level = updates.difficulty_level.or(current.difficulty_level);

    // Recalculate stats if content changed
    let word_count = calculate_word_count(&content);
    let estimated_duration = estimate_duration(word_count);

    // Serialize tags
    let tags_json = updates.tags.as_ref()
        .map(|t| serde_json::to_string(t).ok())
        .flatten()
        .or(current.tags);

    sqlx::query(
        r#"
        UPDATE text_library
        SET title = ?,
            source_type = ?,
            source_url = ?,
            content = ?,
            word_count = ?,
            estimated_duration = ?,
            difficulty_level = ?,
            tags = ?,
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&title)
    .bind(&source_type)
    .bind(&source_url)
    .bind(&content)
    .bind(word_count)
    .bind(estimated_duration)
    .bind(&difficulty_level)
    .bind(&tags_json)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await
    .context("Failed to update text library item")?;

    // Return updated item
    get_text_library_item(pool, id).await
}

/// Delete a text library item
pub async fn delete_text_library_item(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM text_library WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .context("Failed to delete text library item")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_word_count() {
        let text = "The quick brown fox jumps over the lazy dog";
        assert_eq!(calculate_word_count(text), 9);

        let text_with_newlines = "Hello world\nHow are you?\nI'm fine!";
        assert_eq!(calculate_word_count(text_with_newlines), 7);
    }

    #[test]
    fn test_estimate_duration() {
        // 150 words at 150 WPM = 1 minute = 60 seconds
        assert_eq!(estimate_duration(150), 60);

        // 300 words at 150 WPM = 2 minutes = 120 seconds
        assert_eq!(estimate_duration(300), 120);

        // 75 words at 150 WPM = 0.5 minutes = 30 seconds
        assert_eq!(estimate_duration(75), 30);
    }
}
