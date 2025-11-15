/**
 * Language pack download service
 *
 * Handles downloading lemma and translation databases on-demand.
 * Supports parallel downloads with progress tracking.
 */

use anyhow::{Context, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

/// Lock file guard - automatically deletes lock file when dropped
struct LockFileGuard {
    path: PathBuf,
}

impl Drop for LockFileGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
        println!("[LockFileGuard] Removed lock file: {:?}", self.path);
    }
}

/// Progress update for a single file download
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub file_type: String,      // "lemmas" or "translations"
    pub language_pair: String,   // "es" or "es-en"
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_mbps: f32,
}

/// Information about a language pack
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguagePackInfo {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub lemmas_size: u64,
    pub lemmas_url: String,
    pub bundled: bool,
}

/// Information about a translation pack
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationPackInfo {
    pub from_lang: String,
    pub to_lang: String,
    pub size: u64,
    pub url: String,
}

/// Get the directory where language packs are stored
pub fn get_langpacks_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app.path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    let langpacks_dir = app_data_dir.join("langpacks");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&langpacks_dir)
        .context("Failed to create langpacks directory")?;

    Ok(langpacks_dir)
}

/// Check if a lemma database is installed for a language
pub fn is_lemmas_installed(lang: &str, app: &AppHandle) -> Result<bool> {
    // Check bundled resources for English
    if lang == "en" {
        use tauri::Manager;
        if let Ok(resource_path) = app.path().resource_dir() {
            let bundled_path = resource_path.join("langpacks").join("en").join("lemmas.db");
            if bundled_path.exists() {
                return Ok(true);
            }
        }
        // Fall through to check downloaded packs
    }

    let langpacks_dir = get_langpacks_dir(app)?;
    let lemmas_path = langpacks_dir.join(lang).join("lemmas.db");

    Ok(lemmas_path.exists())
}

/// Check if a translation database is installed
pub fn is_translation_installed(from_lang: &str, to_lang: &str, app: &AppHandle) -> Result<bool> {
    let langpacks_dir = get_langpacks_dir(app)?;
    let db_name = format!("{}-{}.db", from_lang, to_lang);
    let translation_path = langpacks_dir.join("translations").join(&db_name);

    Ok(translation_path.exists())
}

/// Get list of installed language codes
pub fn get_installed_languages(app: &AppHandle) -> Result<Vec<String>> {
    let mut installed = Vec::new();

    // Check if English is installed (bundled or downloaded)
    if is_lemmas_installed("en", app)? {
        installed.push("en".to_string());
    }

    let langpacks_dir = get_langpacks_dir(app)?;

    // Check for downloaded language directories
    if let Ok(entries) = std::fs::read_dir(&langpacks_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(dir_name) = entry.file_name().to_str() {
                    // Check if lemmas.db exists in this directory
                    let lemmas_path = entry.path().join("lemmas.db");
                    if lemmas_path.exists() && dir_name != "translations" {
                        installed.push(dir_name.to_string());
                    }
                }
            }
        }
    }

    installed.sort();
    installed.dedup();
    Ok(installed)
}

/// Download a file with progress tracking
async fn download_file_with_progress(
    url: &str,
    destination: PathBuf,
    file_type: &str,
    language_pair: &str,
    app: AppHandle,
) -> Result<()> {
    println!("[download_file] Starting download: {} -> {:?}", url, destination);

    // Create parent directory
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent)
            .context("Failed to create destination directory")?;
    }

    // Create lock file to prevent duplicate downloads
    let lock_file = destination.with_extension("lock");
    if lock_file.exists() {
        println!("[download_file] Download already in progress for {}, skipping", language_pair);
        // Not an error - just means another download is in progress
        return Ok(());
    }
    std::fs::File::create(&lock_file)
        .context("Failed to create lock file")?;

    // Ensure lock file is cleaned up on error or success
    let _guard = LockFileGuard {
        path: lock_file.clone(),
    };

    // Start download
    let client = reqwest::Client::new();
    let response = client.get(url)
        .send()
        .await
        .context("Failed to start download")?;

    let total_size = response.content_length().unwrap_or(0);
    println!("[download_file] Total size: {} bytes", total_size);

    // Download with progress tracking
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut file = std::fs::File::create(&destination)
        .context("Failed to create destination file")?;

    use std::io::Write;
    let start_time = std::time::Instant::now();
    let mut last_progress_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Failed to read chunk")?;
        file.write_all(&chunk).context("Failed to write chunk")?;

        downloaded += chunk.len() as u64;

        // Emit progress every 500ms
        if last_progress_emit.elapsed().as_millis() > 500 || downloaded == total_size {
            let elapsed_secs = start_time.elapsed().as_secs_f32();
            let speed_mbps = if elapsed_secs > 0.0 {
                (downloaded as f32 / 1_000_000.0) / elapsed_secs
            } else {
                0.0
            };

            let percentage = if total_size > 0 {
                (downloaded as f32 / total_size as f32) * 100.0
            } else {
                0.0
            };

            let progress = DownloadProgress {
                file_type: file_type.to_string(),
                language_pair: language_pair.to_string(),
                downloaded_bytes: downloaded,
                total_bytes: total_size,
                percentage,
                speed_mbps,
            };

            // Emit progress event
            let _ = app.emit("download_progress", &progress);

            last_progress_emit = std::time::Instant::now();
        }
    }

    file.sync_all().context("Failed to sync file")?;
    println!("[download_file] Download complete: {:?}", destination);

    Ok(())
}

/// Download lemma database for a language
pub async fn download_lemmas(
    lang: &str,
    url: &str,
    app: AppHandle,
) -> Result<()> {
    println!("[download_lemmas] Downloading {} lemmas from {}", lang, url);

    let langpacks_dir = get_langpacks_dir(&app)?;
    let destination = langpacks_dir.join(lang).join("lemmas.db");

    download_file_with_progress(
        url,
        destination,
        "lemmas",
        lang,
        app,
    ).await?;

    Ok(())
}

/// Download translation database
pub async fn download_translation(
    from_lang: &str,
    to_lang: &str,
    url: &str,
    app: AppHandle,
) -> Result<()> {
    let pair = format!("{}-{}", from_lang, to_lang);
    println!("[download_translation] Downloading {} from {}", pair, url);

    let langpacks_dir = get_langpacks_dir(&app)?;
    let translations_dir = langpacks_dir.join("translations");
    let destination = translations_dir.join(format!("{}.db", pair));

    download_file_with_progress(
        url,
        destination,
        "translations",
        &pair,
        app,
    ).await?;

    Ok(())
}

/// Delete a language pack (lemmas only, keeps translations)
pub fn delete_language_pack(lang: &str, app: &AppHandle) -> Result<()> {
    // Cannot delete English (bundled)
    if lang == "en" {
        anyhow::bail!("Cannot delete bundled English language pack");
    }

    let langpacks_dir = get_langpacks_dir(app)?;
    let lang_dir = langpacks_dir.join(lang);

    if lang_dir.exists() {
        std::fs::remove_dir_all(&lang_dir)
            .context("Failed to delete language pack")?;
    }

    Ok(())
}

/// Get required packs for a language pair
#[derive(Debug, Clone, Serialize)]
pub struct RequiredPacks {
    pub lemmas: Vec<String>,      // Language codes that need lemmas
    pub translations: Vec<(String, String)>,  // (from, to) pairs
}

pub fn get_required_packs(
    primary_lang: &str,
    target_lang: &str,
    app: &AppHandle,
) -> Result<RequiredPacks> {
    let mut lemmas = Vec::new();

    // Check if target language lemmas are installed
    if !is_lemmas_installed(target_lang, app)? {
        lemmas.push(target_lang.to_string());
    }

    // Check if primary language lemmas are installed
    // (needed for reverse lookups in some cases)
    if !is_lemmas_installed(primary_lang, app)? {
        lemmas.push(primary_lang.to_string());
    }

    // No longer checking for translations - we use external dictionaries instead
    Ok(RequiredPacks {
        lemmas,
        translations: Vec::new() // Always empty now
    })
}
