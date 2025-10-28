// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use fluent_diary::commands::{langpack, models, recording, stats, vocabulary};
use fluent_diary::services::recording::RecorderState;
use std::sync::{Arc, Mutex};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Fluent Diary is working.", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .manage(recording::RecorderStateWrapper(Mutex::new(
            RecorderState::new(),
        )))
        .manage(models::DownloadStateWrapper(Arc::new(Mutex::new(
            models::DownloadState::new(),
        ))))
        .invoke_handler(tauri::generate_handler![
            greet,
            langpack::get_lemma,
            langpack::get_translation,
            langpack::lemmatize_batch,
            langpack::translate_batch,
            langpack::process_words,
            vocabulary::record_word,
            vocabulary::get_user_vocab,
            vocabulary::is_new_word,
            vocabulary::get_vocab_stats,
            recording::get_recording_devices,
            recording::start_recording,
            recording::stop_recording,
            recording::is_recording,
            recording::transcribe,
            recording::create_recording_session,
            recording::complete_recording_session,
            models::get_whisper_models,
            models::check_model_installed,
            models::check_default_model_installed,
            models::get_default_whisper_model,
            models::get_whisper_model_path,
            models::get_installed_whisper_models,
            models::download_whisper_model,
            models::delete_whisper_model,
            models::is_download_in_progress,
            stats::get_stats_overall,
            stats::get_stats_top_words,
            stats::get_stats_daily_sessions,
            stats::get_stats_wpm_trends,
            stats::get_stats_vocab_growth,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}