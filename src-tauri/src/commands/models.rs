/**
 * Tauri commands for Whisper model management
 */

use crate::services::model_download::{
    delete_model, download_model, get_available_models, get_default_model,
    get_installed_models, get_model_path, is_model_installed,
    InstalledModelInfo, WhisperModel,
};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Shared state for tracking download progress
pub struct DownloadState {
    pub in_progress: bool,
    pub current_model: Option<String>,
}

impl DownloadState {
    pub fn new() -> Self {
        Self {
            in_progress: false,
            current_model: None,
        }
    }
}

pub struct DownloadStateWrapper(pub Arc<Mutex<DownloadState>>);

/// Get list of available Whisper models
#[tauri::command]
pub fn get_whisper_models() -> Vec<WhisperModel> {
    get_available_models()
}

/// Check if a model is installed
#[tauri::command]
pub fn check_model_installed(app: AppHandle, model_name: String) -> Result<bool, String> {
    is_model_installed(&app, &model_name).map_err(|e| e.to_string())
}

/// Check if the default model is installed
#[tauri::command]
pub fn check_default_model_installed(app: AppHandle) -> Result<bool, String> {
    let default = get_default_model();
    is_model_installed(&app, &default).map_err(|e| e.to_string())
}

/// Get the default model name
#[tauri::command]
pub fn get_default_whisper_model() -> String {
    get_default_model()
}

/// Get path to a model file
#[tauri::command]
pub fn get_whisper_model_path(app: AppHandle, model_name: String) -> Result<String, String> {
    get_model_path(&app, &model_name)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Get list of installed models
#[tauri::command]
pub fn get_installed_whisper_models(app: AppHandle) -> Result<Vec<InstalledModelInfo>, String> {
    get_installed_models(&app).map_err(|e| e.to_string())
}

/// Download a Whisper model with progress events
#[tauri::command]
pub async fn download_whisper_model(
    model_name: String,
    app: AppHandle,
    download_state: tauri::State<'_, DownloadStateWrapper>,
) -> Result<String, String> {
    // Check if download already in progress
    {
        let mut state = download_state.0.lock().unwrap();
        if state.in_progress {
            return Err("Download already in progress".to_string());
        }
        state.in_progress = true;
        state.current_model = Some(model_name.clone());
    }

    // Download with progress callback
    let app_clone = app.clone();
    let result = download_model(&app, &model_name, move |progress| {
        // Emit progress event to frontend
        let _ = app_clone.emit("model-download-progress", progress);
    })
    .await;

    // Clear download state
    {
        let mut state = download_state.0.lock().unwrap();
        state.in_progress = false;
        state.current_model = None;
    }

    match result {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Delete a downloaded model
#[tauri::command]
pub fn delete_whisper_model(app: AppHandle, model_name: String) -> Result<(), String> {
    delete_model(&app, &model_name).map_err(|e| e.to_string())
}

/// Check if any download is in progress
#[tauri::command]
pub fn is_download_in_progress(
    download_state: tauri::State<'_, DownloadStateWrapper>,
) -> bool {
    download_state.0.lock().unwrap().in_progress
}
