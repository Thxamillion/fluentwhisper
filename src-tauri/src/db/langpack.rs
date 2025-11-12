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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_open_lemma_db_spanish() {
        // Note: This test requires the Spanish lemma database to be downloaded
        // In a real test environment, you would set up test fixtures
        // For now, this is a placeholder test
    }
}
