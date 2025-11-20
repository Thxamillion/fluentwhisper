/**
 * Vocabulary service - manages user's discovered words
 *
 * Handles:
 * - Recording new words with forms_spoken tracking
 * - Updating usage counts
 * - Retrieving user vocabulary with filters
 * - Checking if words are new
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabWord {
    pub id: i64,
    pub language: String,
    pub lemma: String,
    pub forms_spoken: Vec<String>,
    pub first_seen_at: i64,
    pub last_seen_at: i64,
    pub usage_count: i32,
    pub mastered: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabWordWithTranslation {
    pub id: i64,
    pub language: String,
    pub lemma: String,
    pub forms_spoken: Vec<String>,
    pub first_seen_at: i64,
    pub last_seen_at: i64,
    pub usage_count: i32,
    pub mastered: bool,
    pub tags: Vec<String>,
    pub translation: Option<String>,
}

/// Get current Unix timestamp in seconds
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

/// Record a word in user's vocabulary
/// If word exists, updates usage_count and adds form to forms_spoken
/// If new, creates new entry
pub async fn record_word(
    pool: &SqlitePool,
    lemma: &str,
    language: &str,
    form_spoken: &str,
) -> Result<bool> {
    let timestamp = now();

    // Check if word already exists
    let existing = sqlx::query(
        "SELECT id, forms_spoken, usage_count FROM vocab WHERE language = ? AND lemma = ?"
    )
    .bind(language)
    .bind(lemma)
    .fetch_optional(pool)
    .await?;

    match existing {
        Some(row) => {
            // Word exists - update it
            let id: i64 = row.get("id");
            let forms_json: String = row.get("forms_spoken");
            let usage_count: i32 = row.get("usage_count");

            // Parse existing forms
            let mut forms: Vec<String> = serde_json::from_str(&forms_json)
                .unwrap_or_default();

            // Add new form if not already present
            if !forms.contains(&form_spoken.to_string()) {
                forms.push(form_spoken.to_string());
            }

            let new_usage_count = usage_count + 1;

            // Update record
            sqlx::query(
                r#"
                UPDATE vocab
                SET forms_spoken = ?,
                    last_seen_at = ?,
                    usage_count = ?,
                    updated_at = ?
                WHERE id = ?
                "#
            )
            .bind(serde_json::to_string(&forms)?)
            .bind(timestamp)
            .bind(new_usage_count)
            .bind(timestamp)
            .bind(id)
            .execute(pool)
            .await?;

            // AUTO-MASTERING LOGIC: Check if word should be auto-mastered
            if new_usage_count >= 20 {
                // Get current tags
                let tags_json: String = sqlx::query_scalar(
                    "SELECT COALESCE(tags, '[]') FROM vocab WHERE id = ?"
                )
                .bind(id)
                .fetch_one(pool)
                .await?;

                let tags: Vec<String> = serde_json::from_str(&tags_json)
                    .unwrap_or_default();

                // Only auto-master if word doesn't have "needs-practice" tag
                // and doesn't already have "mastered" tag
                if !tags.contains(&"needs-practice".to_string()) && !tags.contains(&"mastered".to_string()) {
                    let mastered_tags = vec!["mastered".to_string()];
                    sqlx::query(
                        "UPDATE vocab SET tags = ?, mastered = 1, updated_at = ? WHERE id = ?"
                    )
                    .bind(serde_json::to_string(&mastered_tags)?)
                    .bind(timestamp)
                    .bind(id)
                    .execute(pool)
                    .await?;

                    println!("[vocab] Auto-mastered word '{}' after {} uses", lemma, new_usage_count);
                }
            }

            Ok(false) // Not a new word
        }
        None => {
            // New word - insert it
            let forms = vec![form_spoken.to_string()];

            sqlx::query(
                r#"
                INSERT INTO vocab (
                    language, lemma, forms_spoken,
                    first_seen_at, last_seen_at, usage_count,
                    mastered, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(language)
            .bind(lemma)
            .bind(serde_json::to_string(&forms)?)
            .bind(timestamp)
            .bind(timestamp)
            .bind(1)
            .bind(false)
            .bind(timestamp)
            .bind(timestamp)
            .execute(pool)
            .await?;

            Ok(true) // New word
        }
    }
}

/// Get all vocabulary for a language
pub async fn get_user_vocab(
    pool: &SqlitePool,
    language: &str,
) -> Result<Vec<VocabWord>> {
    let rows = sqlx::query(
        r#"
        SELECT id, language, lemma, forms_spoken,
               first_seen_at, last_seen_at, usage_count, mastered, COALESCE(tags, '[]') as tags
        FROM vocab
        WHERE language = ?
        ORDER BY usage_count DESC, last_seen_at DESC
        "#
    )
    .bind(language)
    .fetch_all(pool)
    .await?;

    let mut words = Vec::new();

    for row in rows {
        let forms_json: String = row.get("forms_spoken");
        let forms: Vec<String> = serde_json::from_str(&forms_json)
            .unwrap_or_default();

        let tags_json: String = row.get("tags");
        let tags: Vec<String> = serde_json::from_str(&tags_json)
            .unwrap_or_default();

        words.push(VocabWord {
            id: row.get("id"),
            language: row.get("language"),
            lemma: row.get("lemma"),
            forms_spoken: forms,
            first_seen_at: row.get("first_seen_at"),
            last_seen_at: row.get("last_seen_at"),
            usage_count: row.get("usage_count"),
            mastered: row.get("mastered"),
            tags,
        });
    }

    Ok(words)
}

/// Check if a word is new (not in vocabulary)
pub async fn is_new_word(
    pool: &SqlitePool,
    lemma: &str,
    language: &str,
) -> Result<bool> {
    let result = sqlx::query(
        "SELECT 1 FROM vocab WHERE language = ? AND lemma = ? LIMIT 1"
    )
    .bind(language)
    .bind(lemma)
    .fetch_optional(pool)
    .await?;

    Ok(result.is_none())
}

/// Get vocabulary statistics for a language
#[derive(Debug, Serialize)]
pub struct VocabStats {
    pub total_words: i32,
    pub mastered_words: i32,
    pub words_this_week: i32,
}

pub async fn get_vocab_stats(
    pool: &SqlitePool,
    language: &str,
) -> Result<VocabStats> {
    let now_ts = now();
    let week_ago = now_ts - (7 * 24 * 60 * 60);

    // Total words
    let total: i32 = sqlx::query("SELECT COUNT(*) as count FROM vocab WHERE language = ?")
        .bind(language)
        .fetch_one(pool)
        .await?
        .get("count");

    // Mastered words
    let mastered: i32 = sqlx::query("SELECT COUNT(*) as count FROM vocab WHERE language = ? AND mastered = 1")
        .bind(language)
        .fetch_one(pool)
        .await?
        .get("count");

    // Words discovered this week
    let this_week: i32 = sqlx::query("SELECT COUNT(*) as count FROM vocab WHERE language = ? AND first_seen_at >= ?")
        .bind(language)
        .bind(week_ago)
        .fetch_one(pool)
        .await?
        .get("count");

    Ok(VocabStats {
        total_words: total,
        mastered_words: mastered,
        words_this_week: this_week,
    })
}

/// Clean up vocabulary by removing punctuation from lemmas
/// Returns the number of lemmas that were cleaned
pub async fn clean_punctuation(pool: &SqlitePool) -> Result<i32> {
    let timestamp = now();

    // Get all vocab entries
    let rows = sqlx::query("SELECT id, lemma FROM vocab")
        .fetch_all(pool)
        .await?;

    let mut cleaned_count = 0;

    for row in rows {
        let id: i64 = row.get("id");
        let lemma: String = row.get("lemma");

        // Strip punctuation from lemma
        let cleaned_lemma: String = lemma
            .trim_matches(|c: char| c.is_ascii_punctuation() || !c.is_alphanumeric())
            .to_string();

        // Only update if lemma changed
        if cleaned_lemma != lemma && !cleaned_lemma.is_empty() {
            sqlx::query(
                r#"
                UPDATE vocab
                SET lemma = ?,
                    updated_at = ?
                WHERE id = ?
                "#
            )
            .bind(&cleaned_lemma)
            .bind(timestamp)
            .bind(id)
            .execute(pool)
            .await?;

            cleaned_count += 1;
        }
    }

    Ok(cleaned_count)
}

/// Get recently learned vocabulary with translations
/// Returns words learned in the last N days, with translations to primary language
pub async fn get_recent_vocab(
    pool: &SqlitePool,
    _app_handle: &tauri::AppHandle,
    language: &str,
    primary_language: &str,
    days: i32,
    limit: i32,
) -> Result<Vec<VocabWordWithTranslation>> {
    let cutoff = now() - (days as i64 * 24 * 60 * 60);

    // Get recent words
    let rows = sqlx::query(
        r#"
        SELECT id, language, lemma, forms_spoken, first_seen_at, last_seen_at, usage_count, mastered, COALESCE(tags, '[]') as tags
        FROM vocab
        WHERE language = ? AND first_seen_at >= ?
        ORDER BY first_seen_at DESC
        LIMIT ?
        "#
    )
    .bind(language)
    .bind(cutoff)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let mut words = Vec::new();

    for row in rows {
        let lemma: String = row.get("lemma");
        let forms_json: String = row.get("forms_spoken");
        let tags_json: String = row.get("tags");

        println!("[get_recent_vocab] Processing lemma: '{}', language: {}, primary_language: {}", lemma, language, primary_language);

        // Check for custom translation only
        let translation = get_custom_translation(pool, &lemma, language, primary_language)
            .await
            .ok()
            .flatten();

        words.push(VocabWordWithTranslation {
            id: row.get("id"),
            language: row.get("language"),
            lemma,
            forms_spoken: serde_json::from_str(&forms_json).unwrap_or_default(),
            first_seen_at: row.get("first_seen_at"),
            last_seen_at: row.get("last_seen_at"),
            usage_count: row.get("usage_count"),
            mastered: row.get("mastered"),
            tags: serde_json::from_str(&tags_json).unwrap_or_default(),
            translation,
        });
    }

    Ok(words)
}

/// Custom translation entry for user-edited translations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomTranslation {
    pub id: i64,
    pub lemma: String,
    pub lang_from: String,
    pub lang_to: String,
    pub custom_translation: String,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Delete a word from user's vocabulary
pub async fn delete_word(pool: &SqlitePool, lemma: &str, language: &str) -> Result<()> {
    sqlx::query("DELETE FROM vocab WHERE lemma = ? AND language = ?")
        .bind(lemma)
        .bind(language)
        .execute(pool)
        .await?;
    Ok(())
}

/// Toggle mastered status for a word
/// DEPRECATED: Use add_tag/remove_tag instead for new code
pub async fn toggle_mastered(pool: &SqlitePool, lemma: &str, language: &str) -> Result<bool> {
    let timestamp = now();

    // Get current mastered status
    let current_mastered: bool = sqlx::query_scalar(
        "SELECT mastered FROM vocab WHERE lemma = ? AND language = ?"
    )
    .bind(lemma)
    .bind(language)
    .fetch_one(pool)
    .await?;

    // Toggle it
    let new_mastered = !current_mastered;

    sqlx::query(
        "UPDATE vocab SET mastered = ?, updated_at = ? WHERE lemma = ? AND language = ?"
    )
    .bind(new_mastered)
    .bind(timestamp)
    .bind(lemma)
    .bind(language)
    .execute(pool)
    .await?;

    Ok(new_mastered)
}

/// Add a tag to a word (user action)
/// Tags are mutually exclusive - adding a new tag removes any existing tag
/// Both tags and mastered boolean are updated for compatibility
pub async fn add_tag(pool: &SqlitePool, lemma: &str, language: &str, tag: &str) -> Result<Vec<String>> {
    let timestamp = now();

    // Get current tags
    let current_tags_json: String = sqlx::query_scalar(
        "SELECT COALESCE(tags, '[]') FROM vocab WHERE lemma = ? AND language = ?"
    )
    .bind(lemma)
    .bind(language)
    .fetch_one(pool)
    .await?;

    let mut tags: Vec<String> = serde_json::from_str(&current_tags_json)
        .unwrap_or_default();

    // Tags are mutually exclusive - remove any existing tag
    tags.clear();

    // Add new tag
    tags.push(tag.to_string());

    // Update database (both tags and mastered for compatibility)
    let new_tags_json = serde_json::to_string(&tags)?;
    let mastered = tag == "mastered";

    sqlx::query(
        "UPDATE vocab SET tags = ?, mastered = ?, updated_at = ? WHERE lemma = ? AND language = ?"
    )
    .bind(&new_tags_json)
    .bind(mastered)
    .bind(timestamp)
    .bind(lemma)
    .bind(language)
    .execute(pool)
    .await?;

    Ok(tags)
}

/// Remove tag from a word
pub async fn remove_tag(pool: &SqlitePool, lemma: &str, language: &str, tag: &str) -> Result<Vec<String>> {
    let timestamp = now();

    // Get current tags
    let current_tags_json: String = sqlx::query_scalar(
        "SELECT COALESCE(tags, '[]') FROM vocab WHERE lemma = ? AND language = ?"
    )
    .bind(lemma)
    .bind(language)
    .fetch_one(pool)
    .await?;

    let mut tags: Vec<String> = serde_json::from_str(&current_tags_json)
        .unwrap_or_default();

    // Remove the tag
    tags.retain(|t| t != tag);

    // Update database (both tags and mastered for compatibility)
    let new_tags_json = serde_json::to_string(&tags)?;
    let mastered = tags.contains(&"mastered".to_string());

    sqlx::query(
        "UPDATE vocab SET tags = ?, mastered = ?, updated_at = ? WHERE lemma = ? AND language = ?"
    )
    .bind(&new_tags_json)
    .bind(mastered)
    .bind(timestamp)
    .bind(lemma)
    .bind(language)
    .execute(pool)
    .await?;

    Ok(tags)
}

/// Get vocabulary filtered by tag
pub async fn get_vocab_by_tag(
    pool: &SqlitePool,
    language: &str,
    tag: &str,
) -> Result<Vec<VocabWord>> {
    let tag_pattern = format!("%\"{}\":%", tag);

    let rows = sqlx::query(
        r#"
        SELECT id, language, lemma, forms_spoken,
               first_seen_at, last_seen_at, usage_count, mastered, COALESCE(tags, '[]') as tags
        FROM vocab
        WHERE language = ? AND tags LIKE ?
        ORDER BY usage_count DESC, last_seen_at DESC
        "#
    )
    .bind(language)
    .bind(tag_pattern)
    .fetch_all(pool)
    .await?;

    let mut words = Vec::new();

    for row in rows {
        let forms_json: String = row.get("forms_spoken");
        let forms: Vec<String> = serde_json::from_str(&forms_json).unwrap_or_default();

        let tags_json: String = row.get("tags");
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        words.push(VocabWord {
            id: row.get("id"),
            language: row.get("language"),
            lemma: row.get("lemma"),
            forms_spoken: forms,
            first_seen_at: row.get("first_seen_at"),
            last_seen_at: row.get("last_seen_at"),
            usage_count: row.get("usage_count"),
            mastered: row.get("mastered"),
            tags,
        });
    }

    Ok(words)
}

/// Fix vocabulary entries by re-lemmatizing inflected forms
/// Returns the number of entries fixed
pub async fn fix_vocab_lemmas(
    pool: &SqlitePool,
    language: &str,
    app_handle: &tauri::AppHandle,
) -> Result<i32> {
    use crate::services::lemmatization;

    println!("[fix_vocab_lemmas] Starting vocabulary lemma fix for language: {}", language);

    // Get all vocabulary entries for this language
    let rows = sqlx::query(
        "SELECT id, lemma, forms_spoken FROM vocab WHERE language = ?"
    )
    .bind(language)
    .fetch_all(pool)
    .await?;

    let mut fixed_count = 0;

    for row in rows {
        let id: i64 = row.get("id");
        let stored_lemma: String = row.get("lemma");
        let forms_json: String = row.get("forms_spoken");

        // Parse forms to get the original spoken form
        let forms: Vec<String> = serde_json::from_str(&forms_json).unwrap_or_default();

        if forms.is_empty() {
            continue;
        }

        // Take the first form as representative
        let representative_form = &forms[0];

        // Get correct lemma from lemmatization service
        match lemmatization::get_lemma(representative_form, language, app_handle).await {
            Ok(Some(correct_lemma)) => {
                // Check if stored lemma is different from correct lemma
                if stored_lemma != correct_lemma {
                    println!("[fix_vocab_lemmas] Fixing: '{}' -> '{}' (was stored as '{}')",
                             representative_form, correct_lemma, stored_lemma);

                    // Update the lemma
                    sqlx::query(
                        "UPDATE vocab SET lemma = ?, updated_at = ? WHERE id = ?"
                    )
                    .bind(&correct_lemma)
                    .bind(now())
                    .bind(id)
                    .execute(pool)
                    .await?;

                    fixed_count += 1;
                }
            }
            Ok(None) => {
                println!("[fix_vocab_lemmas] No lemma found for: '{}'", representative_form);
            }
            Err(e) => {
                println!("[fix_vocab_lemmas] Error lemmatizing '{}': {}", representative_form, e);
            }
        }
    }

    println!("[fix_vocab_lemmas] Fixed {} vocabulary entries", fixed_count);
    Ok(fixed_count)
}

/// Set a custom translation for a word (creates or updates)
pub async fn set_custom_translation(
    pool: &SqlitePool,
    lemma: &str,
    lang_from: &str,
    lang_to: &str,
    custom_translation: &str,
    notes: Option<&str>,
) -> Result<()> {
    let timestamp = now();

    sqlx::query(
        r#"
        INSERT INTO custom_translations
        (lemma, lang_from, lang_to, custom_translation, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lemma, lang_from, lang_to)
        DO UPDATE SET
            custom_translation = excluded.custom_translation,
            notes = excluded.notes,
            updated_at = excluded.updated_at
        "#
    )
    .bind(lemma)
    .bind(lang_from)
    .bind(lang_to)
    .bind(custom_translation)
    .bind(notes)
    .bind(timestamp)
    .bind(timestamp)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get custom translation if exists
pub async fn get_custom_translation(
    pool: &SqlitePool,
    lemma: &str,
    lang_from: &str,
    lang_to: &str,
) -> Result<Option<String>> {
    let result = sqlx::query_scalar(
        "SELECT custom_translation FROM custom_translations
         WHERE lemma = ? AND lang_from = ? AND lang_to = ?"
    )
    .bind(lemma)
    .bind(lang_from)
    .bind(lang_to)
    .fetch_optional(pool)
    .await?;

    Ok(result)
}

/// Delete custom translation (reset to default)
pub async fn delete_custom_translation(
    pool: &SqlitePool,
    lemma: &str,
    lang_from: &str,
    lang_to: &str,
) -> Result<()> {
    sqlx::query(
        "DELETE FROM custom_translations
         WHERE lemma = ? AND lang_from = ? AND lang_to = ?"
    )
    .bind(lemma)
    .bind(lang_from)
    .bind(lang_to)
    .execute(pool)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    /// Create a fresh in-memory database for each test
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .unwrap();

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE vocab (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language TEXT NOT NULL,
                lemma TEXT NOT NULL,
                forms_spoken TEXT,
                first_seen_at INTEGER NOT NULL,
                last_seen_at INTEGER NOT NULL,
                usage_count INTEGER DEFAULT 1,
                mastered BOOLEAN DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(language, lemma)
            )
            "#
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_record_new_word() {
        let pool = setup_test_db().await;

        let is_new = record_word(&pool, "estar", "es", "estoy").await.unwrap();
        assert!(is_new);

        // Verify word was inserted
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words.len(), 1);
        assert_eq!(words[0].lemma, "estar");
        assert_eq!(words[0].forms_spoken, vec!["estoy"]);
        assert_eq!(words[0].usage_count, 1);
    }

    #[tokio::test]
    async fn test_record_existing_word() {
        let pool = setup_test_db().await;

        // Record first time
        record_word(&pool, "estar", "es", "estoy").await.unwrap();

        // Record again with different form
        let is_new = record_word(&pool, "estar", "es", "estás").await.unwrap();
        assert!(!is_new);

        // Verify updated
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words.len(), 1);
        assert_eq!(words[0].forms_spoken.len(), 2);
        assert!(words[0].forms_spoken.contains(&"estoy".to_string()));
        assert!(words[0].forms_spoken.contains(&"estás".to_string()));
        assert_eq!(words[0].usage_count, 2);
    }

    #[tokio::test]
    async fn test_is_new_word() {
        let pool = setup_test_db().await;

        // Should be new
        assert!(is_new_word(&pool, "estar", "es").await.unwrap());

        // Record it
        record_word(&pool, "estar", "es", "estoy").await.unwrap();

        // Should not be new
        assert!(!is_new_word(&pool, "estar", "es").await.unwrap());
    }

    #[tokio::test]
    async fn test_vocab_stats() {
        let pool = setup_test_db().await;

        // Add some words
        record_word(&pool, "estar", "es", "estoy").await.unwrap();
        record_word(&pool, "correr", "es", "corriendo").await.unwrap();
        record_word(&pool, "casa", "es", "casa").await.unwrap();

        let stats = get_vocab_stats(&pool, "es").await.unwrap();
        assert_eq!(stats.total_words, 3);
        assert_eq!(stats.mastered_words, 0);
        assert_eq!(stats.words_this_week, 3);
    }

    #[tokio::test]
    async fn test_delete_word() {
        let pool = setup_test_db().await;

        // Add a word
        record_word(&pool, "estar", "es", "estoy").await.unwrap();

        // Verify it exists
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words.len(), 1);

        // Delete it
        delete_word(&pool, "estar", "es").await.unwrap();

        // Verify it's gone
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words.len(), 0);
    }

    #[tokio::test]
    async fn test_delete_nonexistent_word() {
        let pool = setup_test_db().await;

        // Delete a word that doesn't exist - should not error
        let result = delete_word(&pool, "nonexistent", "es").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_toggle_mastered() {
        let pool = setup_test_db().await;

        // Add a word (mastered defaults to false)
        record_word(&pool, "estar", "es", "estoy").await.unwrap();

        // Verify initial state
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words[0].mastered, false);

        // Toggle to true
        let new_status = toggle_mastered(&pool, "estar", "es").await.unwrap();
        assert_eq!(new_status, true);

        // Verify it was updated
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words[0].mastered, true);

        // Toggle back to false
        let new_status = toggle_mastered(&pool, "estar", "es").await.unwrap();
        assert_eq!(new_status, false);

        // Verify it was updated again
        let words = get_user_vocab(&pool, "es").await.unwrap();
        assert_eq!(words[0].mastered, false);
    }

    #[tokio::test]
    async fn test_toggle_mastered_updates_stats() {
        let pool = setup_test_db().await;

        // Add words
        record_word(&pool, "estar", "es", "estoy").await.unwrap();
        record_word(&pool, "correr", "es", "corriendo").await.unwrap();

        // Initial stats - no mastered words
        let stats = get_vocab_stats(&pool, "es").await.unwrap();
        assert_eq!(stats.mastered_words, 0);

        // Master one word
        toggle_mastered(&pool, "estar", "es").await.unwrap();

        // Stats should show 1 mastered
        let stats = get_vocab_stats(&pool, "es").await.unwrap();
        assert_eq!(stats.mastered_words, 1);

        // Master second word
        toggle_mastered(&pool, "correr", "es").await.unwrap();

        // Stats should show 2 mastered
        let stats = get_vocab_stats(&pool, "es").await.unwrap();
        assert_eq!(stats.mastered_words, 2);
    }
}
