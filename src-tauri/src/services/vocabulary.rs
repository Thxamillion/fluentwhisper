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
            .bind(usage_count + 1)
            .bind(timestamp)
            .bind(id)
            .execute(pool)
            .await?;

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
               first_seen_at, last_seen_at, usage_count, mastered
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

        words.push(VocabWord {
            id: row.get("id"),
            language: row.get("language"),
            lemma: row.get("lemma"),
            forms_spoken: forms,
            first_seen_at: row.get("first_seen_at"),
            last_seen_at: row.get("last_seen_at"),
            usage_count: row.get("usage_count"),
            mastered: row.get("mastered"),
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
}
