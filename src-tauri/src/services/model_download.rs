/**
 * Whisper model download service
 *
 * Handles downloading Whisper models from Hugging Face
 */

use anyhow::{Context, Result};
use reqwest;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

/// Available Whisper models
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModel {
    pub name: String,
    pub display_name: String,
    pub file_name: String,
    pub url: String,
    pub size_mb: u64,
    pub description: String,
    pub premium_required: bool,
}

/// Download progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub is_complete: bool,
}

/// Get the models directory path
pub fn get_models_dir(app: &AppHandle) -> Result<PathBuf> {
    // Use app data directory for persistent storage
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to get app data directory")?;

    let models_dir = app_data_dir.join("models");
    fs::create_dir_all(&models_dir).context("Failed to create models directory")?;
    Ok(models_dir)
}

/// Get list of available Whisper models
pub fn get_available_models() -> Vec<WhisperModel> {
    vec![
        WhisperModel {
            name: "tiny".to_string(),
            display_name: "Tiny".to_string(),
            file_name: "ggml-tiny.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin".to_string(),
            size_mb: 75,
            description: "Fastest, lowest accuracy".to_string(),
            premium_required: false,
        },
        WhisperModel {
            name: "base".to_string(),
            display_name: "Base".to_string(),
            file_name: "ggml-base.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin".to_string(),
            size_mb: 142,
            description: "Good balance, recommended".to_string(),
            premium_required: false,
        },
        WhisperModel {
            name: "small".to_string(),
            display_name: "Small".to_string(),
            file_name: "ggml-small.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin".to_string(),
            size_mb: 466,
            description: "Better accuracy".to_string(),
            premium_required: false,
        },
        WhisperModel {
            name: "medium".to_string(),
            display_name: "Medium".to_string(),
            file_name: "ggml-medium.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin".to_string(),
            size_mb: 1500,
            description: "High accuracy".to_string(),
            premium_required: false,
        },
        WhisperModel {
            name: "large".to_string(),
            display_name: "Large".to_string(),
            file_name: "ggml-large.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin".to_string(),
            size_mb: 2900,
            description: "Highest accuracy".to_string(),
            premium_required: true,
        },
        WhisperModel {
            name: "large-v2".to_string(),
            display_name: "Large-v2".to_string(),
            file_name: "ggml-large-v2.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin".to_string(),
            size_mb: 2900,
            description: "Improved version".to_string(),
            premium_required: true,
        },
        WhisperModel {
            name: "large-v3".to_string(),
            display_name: "Large-v3".to_string(),
            file_name: "ggml-large-v3.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin".to_string(),
            size_mb: 2900,
            description: "Newest and best".to_string(),
            premium_required: true,
        },
    ]
}

/// Check if a model is installed
pub fn is_model_installed(app: &AppHandle, model_name: &str) -> Result<bool> {
    let models_dir = get_models_dir(app)?;
    let models = get_available_models();

    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    let model_path = models_dir.join(&model.file_name);
    Ok(model_path.exists())
}

/// Get the default model name (small)
pub fn get_default_model() -> String {
    "small".to_string()
}

/// Get path to the default model
pub fn get_default_model_path(app: &AppHandle) -> Result<PathBuf> {
    let models_dir = get_models_dir(app)?;
    Ok(models_dir.join("ggml-small.bin"))
}

/// Get path to a specific model
pub fn get_model_path(app: &AppHandle, model_name: &str) -> Result<PathBuf> {
    let models_dir = get_models_dir(app)?;
    let models = get_available_models();

    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    Ok(models_dir.join(&model.file_name))
}

/// Download a Whisper model with progress tracking
pub async fn download_model(
    app: &AppHandle,
    model_name: &str,
    progress_callback: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<PathBuf> {
    let models = get_available_models();
    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    let models_dir = get_models_dir(app)?;
    let output_path = models_dir.join(&model.file_name);

    // If already exists, return immediately
    if output_path.exists() {
        return Ok(output_path);
    }

    // Download the model
    println!("Downloading {} from {}", model.display_name, model.url);

    let client = reqwest::Client::new();
    let response = client
        .get(&model.url)
        .send()
        .await
        .context("Failed to start download")?;

    let total_size = response
        .content_length()
        .ok_or_else(|| anyhow::anyhow!("Failed to get content length"))?;

    // Create temporary file
    let temp_path = output_path.with_extension("tmp");
    let mut file = tokio::fs::File::create(&temp_path)
        .await
        .context("Failed to create temporary file")?;

    // Download in chunks with progress
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Error while downloading")?;
        file.write_all(&chunk)
            .await
            .context("Failed to write to file")?;

        downloaded += chunk.len() as u64;

        let percentage = (downloaded as f64 / total_size as f64) * 100.0;
        progress_callback(DownloadProgress {
            downloaded_bytes: downloaded,
            total_bytes: total_size,
            percentage,
            is_complete: false,
        });
    }

    // Finalize
    file.flush().await.context("Failed to flush file")?;
    drop(file);

    // Move temp file to final location
    tokio::fs::rename(&temp_path, &output_path)
        .await
        .context("Failed to move downloaded file")?;

    // Final progress callback
    progress_callback(DownloadProgress {
        downloaded_bytes: total_size,
        total_bytes: total_size,
        percentage: 100.0,
        is_complete: true,
    });

    println!("Successfully downloaded model to {:?}", output_path);
    Ok(output_path)
}

/// Delete a downloaded model
pub fn delete_model(app: &AppHandle, model_name: &str) -> Result<()> {
    println!("[delete_model] Attempting to delete model: {}", model_name);

    let model_path = get_model_path(app, model_name)?;
    println!("[delete_model] Model path: {:?}", model_path);

    if model_path.exists() {
        println!("[delete_model] File exists, attempting to remove...");
        fs::remove_file(&model_path)
            .context(format!("Failed to delete model at {:?}", model_path))?;
        println!("[delete_model] File removed successfully");
    } else {
        println!("[delete_model] Warning: File does not exist at {:?}", model_path);
    }

    Ok(())
}

/// Get information about installed models
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledModelInfo {
    pub name: String,
    pub display_name: String,
    pub size_bytes: u64,
    pub path: String,
}

pub fn get_installed_models(app: &AppHandle) -> Result<Vec<InstalledModelInfo>> {
    let models = get_available_models();
    let mut installed = Vec::new();

    for model in models {
        if let Ok(true) = is_model_installed(app, &model.name) {
            if let Ok(path) = get_model_path(app, &model.name) {
                if let Ok(metadata) = fs::metadata(&path) {
                    installed.push(InstalledModelInfo {
                        name: model.name.clone(),
                        display_name: model.display_name.clone(),
                        size_bytes: metadata.len(),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Ok(installed)
}
