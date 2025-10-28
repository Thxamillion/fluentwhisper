/**
 * Session management service
 *
 * Handles creation and management of recording sessions, including:
 * - Creating new sessions
 * - Processing transcripts and extracting words
 * - Calculating session stats (WPM, word count, etc.)
 * - Linking sessions to vocabulary
 */

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use super::lemmatization::get_lemma;
use super::vocabulary::record_word;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SessionWord {
    pub lemma: String,
    pub count: i64,
    pub is_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SessionData {
    pub id: String,
    pub language: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub duration: Option<i64>,
    pub audio_path: Option<String>,
    pub transcript: Option<String>,
    pub word_count: Option<i64>,
    pub unique_word_count: Option<i64>,
    pub wpm: Option<f64>,
    pub new_word_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStats {
    pub word_count: i64,
    pub unique_word_count: i64,
    pub wpm: f64,
    pub new_word_count: i64,
}

/// Create a new session
pub async fn create_session(pool: &SqlitePool, language: &str) -> Result<String> {
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    sqlx::query(
        r#"
        INSERT INTO sessions (
            id, language, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&session_id)
    .bind(language)
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .context("Failed to create session")?;

    Ok(session_id)
}

/// Complete a session with transcript and audio data
pub async fn complete_session(
    pool: &SqlitePool,
    session_id: &str,
    audio_path: &str,
    transcript: &str,
    duration_seconds: f32,
    language: &str,
) -> Result<SessionStats> {
    let now = Utc::now().timestamp();
    let duration = duration_seconds as i64;

    // Process the transcript to extract words and calculate stats
    let stats = process_transcript(pool, session_id, transcript, duration, language).await?;

    // Update the session with all data
    sqlx::query(
        r#"
        UPDATE sessions
        SET ended_at = ?,
            duration = ?,
            audio_path = ?,
            transcript = ?,
            word_count = ?,
            unique_word_count = ?,
            wpm = ?,
            new_word_count = ?,
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(now)
    .bind(duration)
    .bind(audio_path)
    .bind(transcript)
    .bind(stats.word_count)
    .bind(stats.unique_word_count)
    .bind(stats.wpm)
    .bind(stats.new_word_count)
    .bind(now)
    .bind(session_id)
    .execute(pool)
    .await
    .context("Failed to update session")?;

    Ok(stats)
}

/// Process transcript to extract words, lemmatize, and save to vocabulary
async fn process_transcript(
    pool: &SqlitePool,
    session_id: &str,
    transcript: &str,
    duration_seconds: i64,
    language: &str,
) -> Result<SessionStats> {
    // Tokenize the transcript into words
    let words = tokenize_transcript(transcript);
    let word_count = words.len() as i64;

    // Calculate WPM (words per minute)
    let duration_minutes = duration_seconds as f64 / 60.0;
    let wpm = if duration_minutes > 0.0 {
        word_count as f64 / duration_minutes
    } else {
        0.0
    };

    // Lemmatize words and count unique lemmas
    let mut lemma_counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut new_words = 0;

    for word in &words {
        // Lemmatize the word
        let lemma = get_lemma(word, language)
            .await
            .ok()
            .flatten()
            .unwrap_or_else(|| word.clone());

        // Count occurrences of each lemma in this session
        *lemma_counts.entry(lemma.clone()).or_insert(0) += 1;

        // Record word in vocabulary and check if it's new
        let is_new = record_word(pool, &lemma, language, word).await?;
        if is_new {
            new_words += 1;
        }
    }

    let unique_word_count = lemma_counts.len() as i64;

    // Save session_words links
    for (lemma, count) in lemma_counts {
        // Check if this is the first time seeing this word globally
        let is_new = is_new_word_for_user(pool, &lemma, language).await?;

        sqlx::query(
            r#"
            INSERT INTO session_words (session_id, lemma, count, is_new)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(session_id)
        .bind(&lemma)
        .bind(count)
        .bind(is_new)
        .execute(pool)
        .await
        .context("Failed to insert session word")?;
    }

    Ok(SessionStats {
        word_count,
        unique_word_count,
        wpm,
        new_word_count: new_words,
    })
}

/// Simple tokenization: split on whitespace and remove punctuation
fn tokenize_transcript(text: &str) -> Vec<String> {
    text.split_whitespace()
        .map(|word| {
            // Remove common punctuation
            word.trim_matches(|c: char| c.is_ascii_punctuation())
                .to_lowercase()
        })
        .filter(|word| !word.is_empty())
        .collect()
}

/// Check if a word is new for the user (first time seeing it)
async fn is_new_word_for_user(pool: &SqlitePool, lemma: &str, language: &str) -> Result<bool> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM vocab
        WHERE lemma = ? AND language = ?
        "#,
    )
    .bind(lemma)
    .bind(language)
    .fetch_one(pool)
    .await
    .context("Failed to check if word is new")?;

    Ok(count == 0)
}

/// Get session by ID
pub async fn get_session(pool: &SqlitePool, session_id: &str) -> Result<SessionData> {
    let session = sqlx::query_as::<_, SessionData>(
        r#"
        SELECT id, language, started_at, ended_at, duration, audio_path, transcript,
               word_count, unique_word_count, wpm, new_word_count
        FROM sessions
        WHERE id = ?
        "#,
    )
    .bind(session_id)
    .fetch_one(pool)
    .await
    .context("Failed to fetch session")?;

    Ok(session)
}

/// Get all sessions for a language
pub async fn get_sessions_by_language(
    pool: &SqlitePool,
    language: &str,
) -> Result<Vec<SessionData>> {
    let sessions = sqlx::query_as::<_, SessionData>(
        r#"
        SELECT id, language, started_at, ended_at, duration, audio_path, transcript,
               word_count, unique_word_count, wpm, new_word_count
        FROM sessions
        WHERE language = ?
        ORDER BY started_at DESC
        "#,
    )
    .bind(language)
    .fetch_all(pool)
    .await
    .context("Failed to fetch sessions")?;

    Ok(sessions)
}

/// Get all sessions (all languages)
pub async fn get_all_sessions(pool: &SqlitePool) -> Result<Vec<SessionData>> {
    let sessions = sqlx::query_as::<_, SessionData>(
        r#"
        SELECT id, language, started_at, ended_at, duration, audio_path, transcript,
               word_count, unique_word_count, wpm, new_word_count
        FROM sessions
        ORDER BY started_at DESC
        "#,
    )
    .fetch_all(pool)
    .await
    .context("Failed to fetch all sessions")?;

    Ok(sessions)
}

/// Get vocabulary words learned in a session
pub async fn get_session_words(pool: &SqlitePool, session_id: &str) -> Result<Vec<SessionWord>> {
    let words = sqlx::query_as::<_, SessionWord>(
        r#"
        SELECT lemma, count, is_new
        FROM session_words
        WHERE session_id = ?
        ORDER BY count DESC
        "#,
    )
    .bind(session_id)
    .fetch_all(pool)
    .await
    .context("Failed to fetch session words")?;

    Ok(words)
}

/// Delete a session and its related data
pub async fn delete_session(pool: &SqlitePool, session_id: &str) -> Result<()> {
    // Delete session_words links first (foreign key constraint)
    sqlx::query("DELETE FROM session_words WHERE session_id = ?")
        .bind(session_id)
        .execute(pool)
        .await
        .context("Failed to delete session words")?;

    // Delete the session
    sqlx::query("DELETE FROM sessions WHERE id = ?")
        .bind(session_id)
        .execute(pool)
        .await
        .context("Failed to delete session")?;

    // Note: We don't delete vocab entries even if this was the only session that used them
    // Vocabulary persists across sessions

    Ok(())
}
