// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use fluent_diary::commands::{cleanup, dictionaries, langpack, language_packs, models, recording, sessions, stats, system, text_library, vocabulary};
use fluent_diary::services::recording::RecorderState;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[tauri::command]
fn log_marker(message: String) {
    println!("[TEST_JS] {}", message);
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Fluent Diary is working.", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            println!("[App][Rust] Fluent Diary initialized");
            if let Some(win) = app.get_webview_window("main") {
                println!("[App][Rust] Main window created: {}", win.label());
            } else {
                println!("[App][Rust] Main window not yet available at setup");
            }
            Ok(())
        })
        .manage(recording::RecorderStateWrapper(Mutex::new(
            RecorderState::new(),
        )))
        .manage(models::DownloadStateWrapper(Arc::new(Mutex::new(
            models::DownloadState::new(),
        ))))
        .invoke_handler(tauri::generate_handler![
            greet,
            log_marker,
            langpack::get_lemma,
            langpack::lemmatize_batch,
            vocabulary::record_word,
            vocabulary::get_user_vocab,
            vocabulary::is_new_word,
            vocabulary::get_vocab_stats,
            vocabulary::clean_vocab_punctuation,
            vocabulary::get_recent_vocab,
            vocabulary::delete_vocab_word,
            vocabulary::toggle_vocab_mastered,
            vocabulary::set_custom_translation,
            vocabulary::get_custom_translation,
            vocabulary::delete_custom_translation,
            vocabulary::fix_vocab_lemmas,
            recording::get_recording_devices,
            recording::start_recording,
            recording::stop_recording,
            recording::is_recording,
            recording::transcribe,
            recording::create_recording_session,
            recording::complete_recording_session,
            recording::read_audio_file,
            recording::delete_audio_file,
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
            sessions::get_all_sessions_command,
            sessions::get_session_command,
            sessions::get_sessions_by_language_command,
            sessions::get_session_words_command,
            sessions::delete_session_command,
            cleanup::run_cleanup,
            text_library::create_text_library_item_command,
            text_library::get_text_library_item_command,
            text_library::get_all_text_library_items_command,
            text_library::get_text_library_by_language_command,
            text_library::update_text_library_item_command,
            text_library::delete_text_library_item_command,
            language_packs::is_lemmas_installed,
            language_packs::is_translation_installed,
            language_packs::get_installed_languages,
            language_packs::download_lemmas,
            language_packs::download_translation,
            language_packs::delete_language_pack,
            language_packs::get_required_packs,
            language_packs::download_language_pair,
            system::get_system_specs,
            system::reset_app_data,
            dictionaries::get_dictionaries,
            dictionaries::update_dictionary_active,
            dictionaries::update_dictionary_sort_order,
            dictionaries::reorder_dictionaries,
            dictionaries::add_dictionary,
            dictionaries::delete_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}