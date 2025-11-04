/**
 * Cleanup service for auto-deleting old sessions
 *
 * Handles deletion of sessions and their audio files based on retention policies.
 */

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use super::sessions::{delete_session, SessionData};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupStats {
    pub deleted_count: usize,
    pub failed_count: usize,
}

/// Delete sessions older than the specified retention period
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `retention_days` - Number of days to keep sessions (sessions older than this will be deleted)
///
/// # Returns
/// * `CleanupStats` - Statistics about the cleanup operation
pub async fn cleanup_old_sessions(
    pool: &SqlitePool,
    retention_days: i64,
) -> Result<CleanupStats> {
    println!("[cleanup_old_sessions] Starting cleanup with retention_days: {}", retention_days);

    // Calculate cutoff timestamp (sessions older than this will be deleted)
    let cutoff_timestamp = Utc::now().timestamp() - (retention_days * 86400);
    println!("[cleanup_old_sessions] Cutoff timestamp: {} ({})", cutoff_timestamp, chrono::DateTime::from_timestamp(cutoff_timestamp, 0).unwrap());

    // Query sessions older than cutoff that have ended
    // Only delete sessions that are complete (have ended_at)
    let old_sessions = sqlx::query_as::<_, SessionData>(
        "SELECT * FROM sessions WHERE ended_at IS NOT NULL AND ended_at < ?"
    )
    .bind(cutoff_timestamp)
    .fetch_all(pool)
    .await
    .context("Failed to fetch old sessions")?;

    let total_found = old_sessions.len();
    println!("[cleanup_old_sessions] Found {} sessions to delete", total_found);

    let mut deleted_count = 0;
    let mut failed_count = 0;

    // Delete each session (this also deletes audio files via our fixed delete_session function)
    for session in old_sessions {
        match delete_session(pool, &session.id).await {
            Ok(_) => {
                deleted_count += 1;
                println!("[cleanup_old_sessions] Deleted session: {}", session.id);
            }
            Err(e) => {
                failed_count += 1;
                eprintln!("[cleanup_old_sessions] Failed to delete session {}: {}", session.id, e);
            }
        }
    }

    println!("[cleanup_old_sessions] Cleanup complete: deleted={}, failed={}", deleted_count, failed_count);

    Ok(CleanupStats {
        deleted_count,
        failed_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use chrono::Duration;

    #[tokio::test]
    async fn test_cleanup_old_sessions() {
        // Create in-memory database
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory database");

        // Create schema (simplified for test)
        sqlx::query(
            r#"
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                language TEXT NOT NULL,
                primary_language TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                audio_path TEXT
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create test sessions
        let now = Utc::now().timestamp();
        let old_session_time = (Utc::now() - Duration::days(40)).timestamp();

        // Recent session (should not be deleted)
        sqlx::query(
            "INSERT INTO sessions (id, language, primary_language, started_at, ended_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("recent")
        .bind("es")
        .bind("en")
        .bind(now)
        .bind(now)
        .execute(&pool)
        .await
        .unwrap();

        // Old session (should be deleted)
        sqlx::query(
            "INSERT INTO sessions (id, language, primary_language, started_at, ended_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind("old")
        .bind("es")
        .bind("en")
        .bind(old_session_time)
        .bind(old_session_time)
        .execute(&pool)
        .await
        .unwrap();

        // Run cleanup with 30 day retention
        let stats = cleanup_old_sessions(&pool, 30).await.unwrap();

        // Verify results
        assert_eq!(stats.deleted_count, 1);
        assert_eq!(stats.failed_count, 0);

        // Verify only old session was deleted
        let remaining: Vec<String> = sqlx::query_scalar("SELECT id FROM sessions")
            .fetch_all(&pool)
            .await
            .unwrap();

        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0], "recent");
    }
}
