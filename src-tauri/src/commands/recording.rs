/**
 * Tauri commands for recording and transcription
 *
 * Exposes recording, transcription, and session management to the frontend
 */

use crate::db::user::open_user_db;
use crate::services::recording::{DeviceInfo, RecorderState, RecordingResult};
use crate::services::sessions::{complete_session, create_session, SessionStats};
use crate::services::transcription::transcribe_audio_file;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};

/// Global recorder state (shared across commands)
pub struct RecorderStateWrapper(pub Mutex<RecorderState>);

// Safety: RecorderState uses Arc/Mutex internally, so it's safe to share across threads
unsafe impl Send for RecorderStateWrapper {}
unsafe impl Sync for RecorderStateWrapper {}

/// Get list of available recording devices
#[tauri::command]
pub async fn get_recording_devices(app_handle: tauri::AppHandle, 
    recorder: State<'_, RecorderStateWrapper>,
) -> Result<Vec<DeviceInfo>, String> {
    let state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.enumerate_devices()
}

/// Start recording audio
#[tauri::command]
pub async fn start_recording(app_handle: tauri::AppHandle, 
    app: tauri::AppHandle,
    recorder: State<'_, RecorderStateWrapper>,
    device_name: Option<String>,
    session_id: String,
) -> Result<(), String> {
    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create audio subdirectory
    let audio_dir = app_data_dir.join("audio");
    std::fs::create_dir_all(&audio_dir)
        .map_err(|e| format!("Failed to create audio directory: {}", e))?;

    // Create output path with absolute path
    let output_path = audio_dir.join(format!("{}.wav", session_id));

    // Start recording
    let mut state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.start_recording(device_name, output_path)
}

/// Stop recording and return metadata
#[tauri::command]
pub async fn stop_recording(app_handle: tauri::AppHandle, 
    recorder: State<'_, RecorderStateWrapper>,
) -> Result<RecordingResult, String> {
    let mut state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.stop_recording()
}

/// Check if currently recording
#[tauri::command]
pub async fn is_recording(app_handle: tauri::AppHandle, recorder: State<'_, RecorderStateWrapper>) -> Result<bool, String> {
    let state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    Ok(state.is_recording())
}

/// Transcribe an audio file
#[tauri::command]
pub async fn transcribe(app_handle: tauri::AppHandle, 
    audio_path: String,
    language: String,
    model_path: Option<String>,
) -> Result<String, String> {
    let audio = Path::new(&audio_path);

    // Use default model path if not provided
    // TODO: Make this configurable via settings
    // Priority: small > base > tiny
    let model = model_path.map(PathBuf::from).unwrap_or_else(|| {
        let small = PathBuf::from("models/ggml-small.bin");
        let base = PathBuf::from("models/ggml-base.bin");
        let tiny = PathBuf::from("models/ggml-tiny.bin");

        if small.exists() {
            small
        } else if base.exists() {
            base
        } else {
            tiny
        }
    });

    // Check if model exists
    if !model.exists() {
        return Err(format!(
            "Whisper model not found at: {}. Please download a model first.",
            model.display()
        ));
    }

    let language_opt = if language.is_empty() {
        None
    } else {
        Some(language.as_str())
    };

    transcribe_audio_file(audio, &model, language_opt)
        .await
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteSessionRequest {
    pub session_id: String,
    pub audio_path: String,
    pub transcript: String,
    pub duration_seconds: f32,
    pub language: String,
    pub session_type: Option<String>,
    pub text_library_id: Option<String>,
    pub source_text: Option<String>,
}

/// Create a new recording session
#[tauri::command]
pub async fn create_recording_session(app_handle: tauri::AppHandle, 
    language: String,
    session_type: Option<String>,
    text_library_id: Option<String>,
    source_text: Option<String>,
) -> Result<String, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;
    create_session(
        &pool,
        &language,
        session_type.as_deref(),
        text_library_id.as_deref(),
        source_text.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// Complete a recording session with transcript and stats
#[tauri::command]
pub async fn complete_recording_session(app_handle: tauri::AppHandle, 
    request: CompleteSessionRequest,
) -> Result<SessionStats, String> {
    let pool = open_user_db(&app_handle).await.map_err(|e| e.to_string())?;

    complete_session(
        &pool,
        &request.session_id,
        &request.audio_path,
        &request.transcript,
        request.duration_seconds,
        &request.language,
        request.session_type.as_deref(),
        request.text_library_id.as_deref(),
        request.source_text.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// Read audio file as bytes for cloud transcription
#[tauri::command]
pub async fn read_audio_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path)
        .map_err(|e| format!("Failed to read audio file: {}", e))
}
