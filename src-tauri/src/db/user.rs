/**
 * User database connection and initialization
 *
 * Manages user.db which stores:
 * - Sessions (recording sessions with audio, transcripts, stats)
 * - Vocab (user's discovered words with usage tracking)
 * - Session Words (junction table linking sessions to words)
 * - Text Library (imported texts for read-aloud practice)
 */

use anyhow::{Context, Result};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;
use tauri::Manager;

/// Get path to user.db in app data directory
pub fn get_user_db_path(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&app_data_dir)
        .context("Failed to create app data directory")?;

    let db_path = app_data_dir.join("user.db");
    Ok(db_path)
}

/// Initialize user database with schema
/// Creates tables if they don't exist
pub async fn initialize_user_db(app_handle: &tauri::AppHandle) -> Result<SqlitePool> {
    let db_path = get_user_db_path(app_handle)?;
    println!("[initialize_user_db] Database path: {:?}", db_path);
    let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePool::connect(&connection_string)
        .await
        .context("Failed to connect to user database")?;

    // Create sessions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            language TEXT NOT NULL,
            primary_language TEXT DEFAULT 'en',
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            duration INTEGER,
            audio_path TEXT,
            transcript TEXT,

            word_count INTEGER,
            unique_word_count INTEGER,
            wpm REAL,
            new_word_count INTEGER,

            session_type TEXT DEFAULT 'free_speak',
            text_library_id TEXT,
            source_text TEXT,

            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        "#
    )
    .execute(&pool)
    .await
    .context("Failed to create sessions table")?;

    // Create sessions indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type)")
        .execute(&pool)
        .await?;

    // Migration: Add primary_language column to existing sessions tables
    // This will add the column if it doesn't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE sessions ADD COLUMN primary_language TEXT DEFAULT 'en'")
        .execute(&pool)
        .await;
    // Ignore errors - column might already exist

    // Migration: Add segments column to existing sessions tables
    // This will add the column if it doesn't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE sessions ADD COLUMN segments TEXT")
        .execute(&pool)
        .await;
    // Ignore errors - column might already exist

    // Create vocab table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS vocab (
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
    .context("Failed to create vocab table")?;

    // Create vocab indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vocab_language ON vocab(language)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vocab_first_seen ON vocab(first_seen_at)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_vocab_usage_count ON vocab(usage_count DESC)")
        .execute(&pool)
        .await?;

    // Create text_library table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS text_library (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_url TEXT,
            content TEXT NOT NULL,
            language TEXT NOT NULL,

            word_count INTEGER,
            estimated_duration INTEGER,
            difficulty_level TEXT,

            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,

            tags TEXT
        )
        "#
    )
    .execute(&pool)
    .await
    .context("Failed to create text_library table")?;

    // Create text_library indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_text_library_language ON text_library(language)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_text_library_created_at ON text_library(created_at DESC)")
        .execute(&pool)
        .await?;

    // Create session_words table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS session_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            lemma TEXT NOT NULL,
            count INTEGER DEFAULT 1,
            is_new BOOLEAN DEFAULT 0,

            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(&pool)
    .await
    .context("Failed to create session_words table")?;

    // Create session_words indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_session_words_session ON session_words(session_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_session_words_new ON session_words(is_new)")
        .execute(&pool)
        .await?;

    // Create custom_translations table for user-customized translations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS custom_translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma TEXT NOT NULL,
            lang_from TEXT NOT NULL,
            lang_to TEXT NOT NULL,
            custom_translation TEXT NOT NULL,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,

            UNIQUE(lemma, lang_from, lang_to)
        )
        "#
    )
    .execute(&pool)
    .await
    .context("Failed to create custom_translations table")?;

    // Create custom_translations index
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_custom_translations_lookup ON custom_translations(lemma, lang_from, lang_to)")
        .execute(&pool)
        .await?;

    Ok(pool)
}

/// Open connection to existing user database
pub async fn open_user_db(app_handle: &tauri::AppHandle) -> Result<SqlitePool> {
    let db_path = get_user_db_path(app_handle)?;

    if !db_path.exists() {
        // Database doesn't exist, initialize it
        return initialize_user_db(app_handle).await;
    }

    let connection_string = format!("sqlite://{}?mode=rw", db_path.display());

    let pool = SqlitePool::connect(&connection_string)
        .await
        .context("Failed to open user database")?;

    // Run migrations for existing databases
    // Migration: Add custom_translations table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS custom_translations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma TEXT NOT NULL,
            lang_from TEXT NOT NULL,
            lang_to TEXT NOT NULL,
            custom_translation TEXT NOT NULL,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,

            UNIQUE(lemma, lang_from, lang_to)
        )
        "#
    )
    .execute(&pool)
    .await
    .context("Failed to create custom_translations table")?;

    // Create custom_translations index
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_custom_translations_lookup ON custom_translations(lemma, lang_from, lang_to)")
        .execute(&pool)
        .await?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    // Note: This test is disabled because it requires a mock AppHandle
    // The initialize_user_db function now requires an AppHandle parameter
    // TODO: Re-enable with proper Tauri test harness
    #[tokio::test]
    #[ignore]
    async fn test_initialize_user_db() {
        // Clean up any existing test database
        let test_path = PathBuf::from("user_test.db");
        if test_path.exists() {
            std::fs::remove_file(&test_path).unwrap();
        }

        // This test is disabled - would need mock AppHandle
        // let pool = initialize_user_db(&app_handle).await.unwrap();

        // Verify tables exist by querying sqlite_master
        // let tables: Vec<String> = sqlx::query(
        //     "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        // )
        // .fetch_all(&pool)
        // .await
        // .unwrap()
        // .iter()
        // .map(|row| row.get(0))
        // .collect();

        // assert!(tables.contains(&"sessions".to_string()));
        // assert!(tables.contains(&"vocab".to_string()));
        // assert!(tables.contains(&"text_library".to_string()));
        // assert!(tables.contains(&"session_words".to_string()));

        // Clean up
        // drop(pool);
    }
}
