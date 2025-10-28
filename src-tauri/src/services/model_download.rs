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
pub fn get_models_dir() -> Result<PathBuf> {
    // For now, use project root. In production, use app_data_dir
    let models_dir = PathBuf::from("models");
    fs::create_dir_all(&models_dir).context("Failed to create models directory")?;
    Ok(models_dir)
}

/// Get list of available Whisper models
pub fn get_available_models() -> Vec<WhisperModel> {
    vec![
        WhisperModel {
            name: "base".to_string(),
            display_name: "Base (Recommended)".to_string(),
            file_name: "ggml-base.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin".to_string(),
            size_mb: 142,
            description: "Good balance of speed and accuracy. Best for most users.".to_string(),
        },
        WhisperModel {
            name: "tiny".to_string(),
            display_name: "Tiny (Fastest)".to_string(),
            file_name: "ggml-tiny.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin".to_string(),
            size_mb: 75,
            description: "Fastest but less accurate. Good for testing.".to_string(),
        },
        WhisperModel {
            name: "small".to_string(),
            display_name: "Small (More Accurate)".to_string(),
            file_name: "ggml-small.bin".to_string(),
            url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin".to_string(),
            size_mb: 466,
            description: "Better accuracy, slower processing.".to_string(),
        },
    ]
}

/// Check if a model is installed
pub fn is_model_installed(model_name: &str) -> Result<bool> {
    let models_dir = get_models_dir()?;
    let models = get_available_models();

    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    let model_path = models_dir.join(&model.file_name);
    Ok(model_path.exists())
}

/// Get the default model name (base)
pub fn get_default_model() -> String {
    "base".to_string()
}

/// Get path to the default model
pub fn get_default_model_path() -> Result<PathBuf> {
    let models_dir = get_models_dir()?;
    Ok(models_dir.join("ggml-base.bin"))
}

/// Get path to a specific model
pub fn get_model_path(model_name: &str) -> Result<PathBuf> {
    let models_dir = get_models_dir()?;
    let models = get_available_models();

    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    Ok(models_dir.join(&model.file_name))
}

/// Download a Whisper model with progress tracking
pub async fn download_model(
    model_name: &str,
    progress_callback: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<PathBuf> {
    let models = get_available_models();
    let model = models
        .iter()
        .find(|m| m.name == model_name)
        .ok_or_else(|| anyhow::anyhow!("Unknown model: {}", model_name))?;

    let models_dir = get_models_dir()?;
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
pub fn delete_model(model_name: &str) -> Result<()> {
    let model_path = get_model_path(model_name)?;

    if model_path.exists() {
        fs::remove_file(&model_path)
            .context(format!("Failed to delete model at {:?}", model_path))?;
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

pub fn get_installed_models() -> Result<Vec<InstalledModelInfo>> {
    let models = get_available_models();
    let mut installed = Vec::new();

    for model in models {
        if let Ok(true) = is_model_installed(&model.name) {
            if let Ok(path) = get_model_path(&model.name) {
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
