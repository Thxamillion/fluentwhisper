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
use tauri::State;

/// Global recorder state (shared across commands)
pub struct RecorderStateWrapper(pub Mutex<RecorderState>);

// Safety: RecorderState uses Arc/Mutex internally, so it's safe to share across threads
unsafe impl Send for RecorderStateWrapper {}
unsafe impl Sync for RecorderStateWrapper {}

/// Get list of available recording devices
#[tauri::command]
pub async fn get_recording_devices(
    recorder: State<'_, RecorderStateWrapper>,
) -> Result<Vec<DeviceInfo>, String> {
    let state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.enumerate_devices()
}

/// Start recording audio
#[tauri::command]
pub async fn start_recording(
    recorder: State<'_, RecorderStateWrapper>,
    device_name: Option<String>,
    session_id: String,
) -> Result<(), String> {
    // Create output directory if it doesn't exist
    let audio_dir = PathBuf::from("audio");
    std::fs::create_dir_all(&audio_dir).map_err(|e| format!("Failed to create audio directory: {}", e))?;

    // Create output path
    let output_path = audio_dir.join(format!("{}.wav", session_id));

    // Start recording
    let mut state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.start_recording(device_name, output_path)
}

/// Stop recording and return metadata
#[tauri::command]
pub async fn stop_recording(
    recorder: State<'_, RecorderStateWrapper>,
) -> Result<RecordingResult, String> {
    let mut state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    state.stop_recording()
}

/// Check if currently recording
#[tauri::command]
pub async fn is_recording(recorder: State<'_, RecorderStateWrapper>) -> Result<bool, String> {
    let state = recorder.inner().0.lock().map_err(|e| e.to_string())?;
    Ok(state.is_recording())
}

/// Transcribe an audio file
#[tauri::command]
pub async fn transcribe(
    audio_path: String,
    language: String,
    model_path: Option<String>,
) -> Result<String, String> {
    let audio = Path::new(&audio_path);

    // Use default model path if not provided
    // TODO: Make this configurable via settings
    let model = model_path
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("models/ggml-base.bin"));

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
}

/// Create a new recording session
#[tauri::command]
pub async fn create_recording_session(language: String) -> Result<String, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;
    create_session(&pool, &language)
        .await
        .map_err(|e| e.to_string())
}

/// Complete a recording session with transcript and stats
#[tauri::command]
pub async fn complete_recording_session(
    request: CompleteSessionRequest,
) -> Result<SessionStats, String> {
    let pool = open_user_db().await.map_err(|e| e.to_string())?;

    complete_session(
        &pool,
        &request.session_id,
        &request.audio_path,
        &request.transcript,
        request.duration_seconds,
        &request.language,
    )
    .await
    .map_err(|e| e.to_string())
}
