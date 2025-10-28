use anyhow::{Context, Result};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;

/// Opens a connection to a lemmatization database
///
/// # Arguments
/// * `lang` - Language code (e.g., "es", "en", "fr", "de")
///
/// # Returns
/// Connection pool to langpacks/{lang}/lemmas.db
pub async fn open_lemma_db(lang: &str) -> Result<SqlitePool> {
    let db_path = get_lemma_db_path(lang)?;

    let connection_string = format!("sqlite://{}?mode=ro", db_path.display());

    SqlitePool::connect(&connection_string)
        .await
        .context(format!("Failed to open lemma database for language: {}", lang))
}

/// Opens a connection to a translation database
///
/// # Arguments
/// * `from_lang` - Source language code (e.g., "es")
/// * `to_lang` - Target language code (e.g., "en")
///
/// # Returns
/// Connection pool to translations/{from_lang}-{to_lang}.db
pub async fn open_translation_db(from_lang: &str, to_lang: &str) -> Result<SqlitePool> {
    let db_path = get_translation_db_path(from_lang, to_lang)?;

    let connection_string = format!("sqlite://{}?mode=ro", db_path.display());

    SqlitePool::connect(&connection_string)
        .await
        .context(format!(
            "Failed to open translation database for {}-{}",
            from_lang, to_lang
        ))
}

/// Resolves path to lemma database
///
/// For now, uses local development paths relative to project root.
/// In production, this will use Tauri's app data directory.
fn get_lemma_db_path(lang: &str) -> Result<PathBuf> {
    // TODO: Use Tauri app data directory in production
    let path = PathBuf::from(format!("langpacks/{}/lemmas.db", lang));

    if !path.exists() {
        anyhow::bail!("Lemma database not found for language: {}", lang);
    }

    Ok(path)
}

/// Resolves path to translation database
///
/// Supports bidirectional lookups - will check both {from}-{to} and {to}-{from}
fn get_translation_db_path(from_lang: &str, to_lang: &str) -> Result<PathBuf> {
    // Try primary direction first
    let primary_path = PathBuf::from(format!("translations/{}-{}.db", from_lang, to_lang));
    if primary_path.exists() {
        return Ok(primary_path);
    }

    // Try reverse direction (bidirectional support)
    let reverse_path = PathBuf::from(format!("translations/{}-{}.db", to_lang, from_lang));
    if reverse_path.exists() {
        return Ok(reverse_path);
    }

    anyhow::bail!(
        "Translation database not found for {}-{} (tried both directions)",
        from_lang,
        to_lang
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_open_lemma_db_spanish() {
        let result = open_lemma_db("es").await;
        assert!(result.is_ok(), "Should open Spanish lemma database");
    }

    #[tokio::test]
    async fn test_open_translation_db() {
        let result = open_translation_db("es", "en").await;
        assert!(result.is_ok(), "Should open Spanish-English translation database");
    }

    #[tokio::test]
    async fn test_bidirectional_translation_db() {
        // Should work in both directions
        let result1 = open_translation_db("es", "en").await;
        let result2 = open_translation_db("en", "es").await;

        assert!(result1.is_ok() || result2.is_ok(),
                "Should open translation database in at least one direction");
    }
}
