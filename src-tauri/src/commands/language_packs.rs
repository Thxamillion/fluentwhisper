/**
 * Tauri commands for language pack management
 * Exposes language pack service to the frontend
 */

use crate::services::language_packs::{self, RequiredPacks};

/// Check if a language's lemma database is installed
#[tauri::command]
pub fn is_lemmas_installed(app_handle: tauri::AppHandle, lang: String) -> Result<bool, String> {
    language_packs::is_lemmas_installed(&lang, &app_handle).map_err(|e| e.to_string())
}

/// Check if a translation database is installed
#[tauri::command]
pub fn is_translation_installed(
    app_handle: tauri::AppHandle,
    from_lang: String,
    to_lang: String,
) -> Result<bool, String> {
    language_packs::is_translation_installed(&from_lang, &to_lang, &app_handle)
        .map_err(|e| e.to_string())
}

/// Get list of installed language codes
#[tauri::command]
pub fn get_installed_languages(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    language_packs::get_installed_languages(&app_handle).map_err(|e| e.to_string())
}

/// Download lemma database for a language
#[tauri::command]
pub async fn download_lemmas(
    app_handle: tauri::AppHandle,
    lang: String,
    url: String,
) -> Result<(), String> {
    language_packs::download_lemmas(&lang, &url, app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// Download translation database
#[tauri::command]
pub async fn download_translation(
    app_handle: tauri::AppHandle,
    from_lang: String,
    to_lang: String,
    url: String,
) -> Result<(), String> {
    language_packs::download_translation(&from_lang, &to_lang, &url, app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a language pack
#[tauri::command]
pub fn delete_language_pack(app_handle: tauri::AppHandle, lang: String) -> Result<(), String> {
    language_packs::delete_language_pack(&lang, &app_handle).map_err(|e| e.to_string())
}

/// Get required packs for a language pair
/// Returns which lemmas and translations need to be downloaded
#[tauri::command]
pub fn get_required_packs(
    app_handle: tauri::AppHandle,
    primary_lang: String,
    target_lang: String,
) -> Result<RequiredPacks, String> {
    language_packs::get_required_packs(&primary_lang, &target_lang, &app_handle)
        .map_err(|e| e.to_string())
}

/// Download all required packs for a language pair
/// This is the main command the frontend will use
#[tauri::command]
pub async fn download_language_pair(
    app_handle: tauri::AppHandle,
    primary_lang: String,
    target_lang: String,
    manifest_url: String,
) -> Result<(), String> {
    println!(
        "[download_language_pair] primary={}, target={}, manifest={}",
        primary_lang, target_lang, manifest_url
    );

    // Fetch manifest to get download URLs
    let manifest = fetch_manifest(&manifest_url)
        .await
        .map_err(|e| format!("Failed to fetch manifest: {}", e))?;

    // Get what needs to be downloaded
    let required = language_packs::get_required_packs(&primary_lang, &target_lang, &app_handle)
        .map_err(|e| e.to_string())?;

    println!("[download_language_pair] Required packs: {:?}", required);

    // Download lemmas in parallel
    let mut lemma_downloads = Vec::new();
    for lang in &required.lemmas {
        if let Some(lang_info) = manifest.languages.get(lang) {
            if !lang_info.bundled {
                let app_clone = app_handle.clone();
                let url = lang_info.lemmas_url.clone();
                let lang_clone = lang.clone();

                lemma_downloads.push(tokio::spawn(async move {
                    language_packs::download_lemmas(&lang_clone, &url, app_clone).await
                }));
            }
        }
    }

    // Download translations in parallel
    let mut translation_downloads = Vec::new();
    for (from_lang, to_lang) in &required.translations {
        // Find translation pack in manifest (try both directions)
        let pack = manifest
            .translations
            .iter()
            .find(|p| {
                // Try forward direction
                (p.from_lang == *from_lang && p.to_lang == *to_lang) ||
                // Try reverse direction
                (p.from_lang == *to_lang && p.to_lang == *from_lang)
            });

        if let Some(pack) = pack {
            println!("[download_language_pair] Found translation pack: {}-{} (URL: {})", from_lang, to_lang, pack.url);
            let app_clone = app_handle.clone();
            let url = pack.url.clone();
            let from = from_lang.clone();
            let to = to_lang.clone();

            translation_downloads.push(tokio::spawn(async move {
                language_packs::download_translation(&from, &to, &url, app_clone).await
            }));
        } else {
            println!("[download_language_pair] WARNING: No translation pack found for {}-{}", from_lang, to_lang);
        }
    }

    // Wait for all downloads to complete
    for handle in lemma_downloads {
        handle
            .await
            .map_err(|e| format!("Download task failed: {}", e))?
            .map_err(|e| format!("Lemma download failed: {}", e))?;
    }

    for handle in translation_downloads {
        handle
            .await
            .map_err(|e| format!("Download task failed: {}", e))?
            .map_err(|e| format!("Translation download failed: {}", e))?;
    }

    println!("[download_language_pair] All downloads complete");
    Ok(())
}

/// Language pack manifest structure
#[derive(Debug, serde::Deserialize)]
struct Manifest {
    languages: std::collections::HashMap<String, LanguageInfo>,
    translations: Vec<TranslationInfo>,
}

#[derive(Debug, serde::Deserialize)]
struct LanguageInfo {
    lemmas_url: String,
    bundled: bool,
}

#[derive(Debug, serde::Deserialize)]
struct TranslationInfo {
    from_lang: String,
    to_lang: String,
    url: String,
}

/// Fetch and parse the language pack manifest
async fn fetch_manifest(url: &str) -> anyhow::Result<Manifest> {
    let response = reqwest::get(url).await?;
    let manifest: Manifest = response.json().await?;
    Ok(manifest)
}
