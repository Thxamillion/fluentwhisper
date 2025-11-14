/**
 * Stats and analytics service
 *
 * Provides aggregate statistics across all sessions and vocabulary
 */

use anyhow::Result;
use chrono::{Local, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

/// Overall statistics summary
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverallStats {
    pub total_sessions: i64,
    pub total_speaking_time_seconds: i64,
    pub total_vocabulary_size: i64,
    pub average_wpm: f64,
    pub current_streak_days: i64,
    pub longest_streak_days: i64,
    pub avg_unique_words_per_session: f64,
    pub avg_new_words_per_session: f64,
}

/// Top word statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopWord {
    pub lemma: String,
    pub usage_count: i64,
    pub forms_spoken: Vec<String>,
}

/// Daily session count for streaks/calendar
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySessionCount {
    pub date: String, // YYYY-MM-DD format
    pub session_count: i64,
    pub total_minutes: i64,
}

/// WPM trend data point
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WpmTrend {
    pub date: String, // YYYY-MM-DD format
    pub avg_wpm: f64,
}

/// Vocabulary growth data point
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabGrowth {
    pub date: String, // YYYY-MM-DD format
    pub new_words: i64,
    pub cumulative_total: i64,
}

/// Get overall statistics
pub async fn get_overall_stats(pool: &SqlitePool, language: Option<&str>) -> Result<OverallStats> {
    // Total sessions
    let total_sessions: i64 = if let Some(lang) = language {
        sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE language = ?")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT COUNT(*) FROM sessions")
            .fetch_one(pool)
            .await?
    };

    // Total speaking time
    let total_time: Option<i64> = if let Some(lang) = language {
        sqlx::query_scalar("SELECT SUM(duration) FROM sessions WHERE language = ?")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT SUM(duration) FROM sessions")
            .fetch_one(pool)
            .await?
    };

    // Total vocabulary size
    let total_vocab: i64 = if let Some(lang) = language {
        sqlx::query_scalar("SELECT COUNT(*) FROM vocab WHERE language = ?")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT COUNT(*) FROM vocab")
            .fetch_one(pool)
            .await?
    };

    // Average WPM
    let avg_wpm: Option<f64> = if let Some(lang) = language {
        sqlx::query_scalar("SELECT AVG(wpm) FROM sessions WHERE language = ? AND wpm IS NOT NULL")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT AVG(wpm) FROM sessions WHERE wpm IS NOT NULL")
            .fetch_one(pool)
            .await?
    };

    // Average unique words per session
    let avg_unique: Option<f64> = if let Some(lang) = language {
        sqlx::query_scalar("SELECT AVG(unique_word_count) FROM sessions WHERE language = ? AND unique_word_count IS NOT NULL")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT AVG(unique_word_count) FROM sessions WHERE unique_word_count IS NOT NULL")
            .fetch_one(pool)
            .await?
    };

    // Average new words per session
    let avg_new: Option<f64> = if let Some(lang) = language {
        sqlx::query_scalar("SELECT AVG(new_word_count) FROM sessions WHERE language = ? AND new_word_count IS NOT NULL")
            .bind(lang)
            .fetch_one(pool)
            .await?
    } else {
        sqlx::query_scalar("SELECT AVG(new_word_count) FROM sessions WHERE new_word_count IS NOT NULL")
            .fetch_one(pool)
            .await?
    };

    // Calculate streaks
    let daily_counts = get_daily_session_counts(pool, language, None).await?;
    let (current_streak, longest_streak) = calculate_streaks(&daily_counts);

    Ok(OverallStats {
        total_sessions,
        total_speaking_time_seconds: total_time.unwrap_or(0),
        total_vocabulary_size: total_vocab,
        average_wpm: avg_wpm.unwrap_or(0.0),
        current_streak_days: current_streak,
        longest_streak_days: longest_streak,
        avg_unique_words_per_session: avg_unique.unwrap_or(0.0),
        avg_new_words_per_session: avg_new.unwrap_or(0.0),
    })
}

/// Get top N most practiced words
pub async fn get_top_words(
    pool: &SqlitePool,
    language: &str,
    limit: i64,
) -> Result<Vec<TopWord>> {
    let rows = sqlx::query_as::<_, (String, i64, String)>(
        r#"
        SELECT lemma, usage_count, forms_spoken
        FROM vocab
        WHERE language = ?
        ORDER BY usage_count DESC
        LIMIT ?
        "#,
    )
    .bind(language)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let top_words = rows
        .into_iter()
        .map(|(lemma, usage_count, forms_json)| {
            let forms: Vec<String> = serde_json::from_str(&forms_json).unwrap_or_default();
            TopWord {
                lemma,
                usage_count,
                forms_spoken: forms,
            }
        })
        .collect();

    Ok(top_words)
}

/// Get daily session counts for calendar/streaks
pub async fn get_daily_session_counts(
    pool: &SqlitePool,
    language: Option<&str>,
    days: Option<i64>,
) -> Result<Vec<DailySessionCount>> {
    let rows = match (language, days) {
        (Some(lang), Some(d)) => {
            sqlx::query_as::<_, (String, i64, i64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    COUNT(*) as session_count,
                    COALESCE((SUM(duration) + 59) / 60, 0) as total_minutes
                FROM sessions
                WHERE language = ? AND started_at >= strftime('%s', 'now', '-' || ? || ' days')
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(lang)
            .bind(d)
            .fetch_all(pool)
            .await?
        }
        (Some(lang), None) => {
            sqlx::query_as::<_, (String, i64, i64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    COUNT(*) as session_count,
                    COALESCE((SUM(duration) + 59) / 60, 0) as total_minutes
                FROM sessions
                WHERE language = ?
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(lang)
            .fetch_all(pool)
            .await?
        }
        (None, Some(d)) => {
            sqlx::query_as::<_, (String, i64, i64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    COUNT(*) as session_count,
                    COALESCE((SUM(duration) + 59) / 60, 0) as total_minutes
                FROM sessions
                WHERE started_at >= strftime('%s', 'now', '-' || ? || ' days')
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(d)
            .fetch_all(pool)
            .await?
        }
        (None, None) => {
            sqlx::query_as::<_, (String, i64, i64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    COUNT(*) as session_count,
                    COALESCE((SUM(duration) + 59) / 60, 0) as total_minutes
                FROM sessions
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .fetch_all(pool)
            .await?
        }
    };

    let daily_counts = rows
        .into_iter()
        .map(|(date, count, minutes)| DailySessionCount {
            date,
            session_count: count,
            total_minutes: minutes,
        })
        .collect();

    Ok(daily_counts)
}

/// Get WPM trends over time
pub async fn get_wpm_trends(
    pool: &SqlitePool,
    language: Option<&str>,
    days: Option<i64>,
) -> Result<Vec<WpmTrend>> {
    let rows = match (language, days) {
        (Some(lang), Some(d)) => {
            sqlx::query_as::<_, (String, f64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    AVG(wpm) as avg_wpm
                FROM sessions
                WHERE language = ? AND wpm IS NOT NULL AND started_at >= strftime('%s', 'now', '-' || ? || ' days')
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(lang)
            .bind(d)
            .fetch_all(pool)
            .await?
        }
        (Some(lang), None) => {
            sqlx::query_as::<_, (String, f64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    AVG(wpm) as avg_wpm
                FROM sessions
                WHERE language = ? AND wpm IS NOT NULL
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(lang)
            .fetch_all(pool)
            .await?
        }
        (None, Some(d)) => {
            sqlx::query_as::<_, (String, f64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    AVG(wpm) as avg_wpm
                FROM sessions
                WHERE wpm IS NOT NULL AND started_at >= strftime('%s', 'now', '-' || ? || ' days')
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .bind(d)
            .fetch_all(pool)
            .await?
        }
        (None, None) => {
            sqlx::query_as::<_, (String, f64)>(
                r#"
                SELECT
                    DATE(started_at, 'unixepoch', 'localtime') as date,
                    AVG(wpm) as avg_wpm
                FROM sessions
                WHERE wpm IS NOT NULL
                GROUP BY DATE(started_at, 'unixepoch', 'localtime')
                ORDER BY date
                "#,
            )
            .fetch_all(pool)
            .await?
        }
    };

    let trends = rows
        .into_iter()
        .map(|(date, avg)| WpmTrend {
            date,
            avg_wpm: avg,
        })
        .collect();

    Ok(trends)
}

/// Get vocabulary growth over time
pub async fn get_vocab_growth(
    pool: &SqlitePool,
    language: &str,
) -> Result<Vec<VocabGrowth>> {
    let rows = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            DATE(first_seen_at, 'unixepoch', 'localtime') as date,
            COUNT(*) as new_words
        FROM vocab
        WHERE language = ?
        GROUP BY DATE(first_seen_at, 'unixepoch', 'localtime')
        ORDER BY date
        "#,
    )
    .bind(language)
    .fetch_all(pool)
    .await?;

    // Calculate cumulative totals
    let mut cumulative = 0i64;
    let growth = rows
        .into_iter()
        .map(|(date, new_words)| {
            cumulative += new_words;
            VocabGrowth {
                date,
                new_words,
                cumulative_total: cumulative,
            }
        })
        .collect();

    Ok(growth)
}

/// Calculate current and longest streaks from daily session counts
fn calculate_streaks(daily_counts: &[DailySessionCount]) -> (i64, i64) {
    if daily_counts.is_empty() {
        return (0, 0);
    }

    let today = Local::now().date_naive();
    let mut current_streak = 0i64;
    let mut longest_streak = 0i64;
    let mut temp_streak = 0i64;
    let mut last_date: Option<NaiveDate> = None;

    // Sort by date descending to calculate current streak
    let mut sorted = daily_counts.to_vec();
    sorted.sort_by(|a, b| b.date.cmp(&a.date));

    // Calculate current streak (from today backwards)
    for item in &sorted {
        if let Ok(date) = NaiveDate::parse_from_str(&item.date, "%Y-%m-%d") {
            let expected_date = if current_streak == 0 {
                today
            } else {
                today - chrono::Duration::days(current_streak)
            };

            if date == expected_date {
                current_streak += 1;
            } else if current_streak > 0 {
                break;
            }
        }
    }

    // Calculate longest streak (iterate through all dates)
    sorted.sort_by(|a, b| a.date.cmp(&b.date));
    for item in &sorted {
        if let Ok(date) = NaiveDate::parse_from_str(&item.date, "%Y-%m-%d") {
            if let Some(last) = last_date {
                let diff = date.signed_duration_since(last).num_days();
                if diff == 1 {
                    temp_streak += 1;
                } else {
                    longest_streak = longest_streak.max(temp_streak);
                    temp_streak = 1;
                }
            } else {
                temp_streak = 1;
            }
            last_date = Some(date);
        }
    }
    longest_streak = longest_streak.max(temp_streak);

    (current_streak, longest_streak)
}
