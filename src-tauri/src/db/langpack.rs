use anyhow::{Context, Result};
use sqlx::sqlite::SqlitePool;
use std::path::PathBuf;
use tauri::AppHandle;

/// Opens a connection to a lemmatization database
///
/// Checks bundled resources first (English), then downloaded packs
///
/// # Arguments
/// * `lang` - Language code (e.g., "es", "en", "fr", "de")
/// * `app` - Tauri app handle for path resolution
///
/// # Returns
/// Connection pool to langpacks/{lang}/lemmas.db
pub async fn open_lemma_db(lang: &str, app: &AppHandle) -> Result<SqlitePool> {
    let db_path = get_lemma_db_path(lang, app)?;

    let connection_string = format!("sqlite://{}?mode=ro", db_path.display());

    SqlitePool::connect(&connection_string)
        .await
        .context(format!("Failed to open lemma database for language: {}", lang))
}

/// Opens a connection to a translation database
///
/// Checks downloaded packs in app data directory
///
/// # Arguments
/// * `from_lang` - Source language code (e.g., "es")
/// * `to_lang` - Target language code (e.g., "en")
/// * `app` - Tauri app handle for path resolution
///
/// # Returns
/// Connection pool to translations/{from_lang}-{to_lang}.db
pub async fn open_translation_db(from_lang: &str, to_lang: &str, app: &AppHandle) -> Result<SqlitePool> {
    let db_path = get_translation_db_path(from_lang, to_lang, app)?;

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
/// Priority order:
/// 1. Bundled resources (English only)
/// 2. Downloaded packs in app data directory
fn get_lemma_db_path(lang: &str, app: &AppHandle) -> Result<PathBuf> {
    use tauri::Manager;

    // 1. Check if English (bundled with app)
    if lang == "en" {
        // Try bundled resource first
        if let Ok(resource_path) = app.path().resource_dir() {
            let bundled_path = resource_path.join("langpacks").join("en").join("lemmas.db");
            if bundled_path.exists() {
                println!("[get_lemma_db_path] Using bundled English: {:?}", bundled_path);
                return Ok(bundled_path);
            }
        }
    }

    // 2. Check downloaded packs in app data directory
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let downloaded_path = app_data_dir
            .join("langpacks")
            .join(lang)
            .join("lemmas.db");

        if downloaded_path.exists() {
            println!("[get_lemma_db_path] Using downloaded pack: {:?}", downloaded_path);
            return Ok(downloaded_path);
        }
    }

    anyhow::bail!(
        "Lemma database not found for language: {}. Please download the language pack first.",
        lang
    )
}

/// Resolves path to translation database
///
/// Supports bidirectional lookups - will check both {from}-{to} and {to}-{from}
///
/// Priority order:
/// 1. Downloaded packs in app data directory
fn get_translation_db_path(from_lang: &str, to_lang: &str, app: &AppHandle) -> Result<PathBuf> {
    use tauri::Manager;

    let primary_name = format!("{}-{}.db", from_lang, to_lang);
    let reverse_name = format!("{}-{}.db", to_lang, from_lang);

    // Check downloaded packs in app data directory
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let translations_dir = app_data_dir.join("langpacks").join("translations");

        // Try primary direction
        let downloaded_primary = translations_dir.join(&primary_name);
        if downloaded_primary.exists() {
            println!("[get_translation_db_path] Using downloaded (primary): {:?}", downloaded_primary);
            return Ok(downloaded_primary);
        }

        // Try reverse direction
        let downloaded_reverse = translations_dir.join(&reverse_name);
        if downloaded_reverse.exists() {
            println!("[get_translation_db_path] Using downloaded (reverse): {:?}", downloaded_reverse);
            return Ok(downloaded_reverse);
        }
    }

    anyhow::bail!(
        "Translation database not found for {}-{} (tried both directions). Please download the language pack first.",
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
