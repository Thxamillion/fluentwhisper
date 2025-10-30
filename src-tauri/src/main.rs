// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use fluent_diary::commands::{auth, langpack, models, recording, sessions, stats, text_library, vocabulary};
use fluent_diary::services::recording::RecorderState;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Fluent Diary is working.", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Register deep link handler for OAuth callbacks
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                // Try to register deep links, but don't fail if it doesn't work
                match app.deep_link().register_all() {
                    Ok(_) => {
                        println!("Deep links registered successfully");

                        let handle = app.handle().clone();
                        app.deep_link().on_open_url(move |event| {
                            let url = event.urls().first().map(|u| u.to_string());

                            if let Some(url_str) = url {
                                println!("Received deep link: {}", url_str);

                                // Parse fluentwhisper://auth-callback?access_token=...&refresh_token=...
                                if url_str.starts_with("fluentwhisper://auth-callback") {
                                    if let Ok(url) = url::Url::parse(&url_str) {
                                        let params: std::collections::HashMap<_, _> = url.query_pairs().collect();

                                        // Check for error
                                        if let Some(error) = params.get("error") {
                                            eprintln!("Auth error: {}", error);
                                            let _ = handle.emit("auth-error", error.to_string());
                                            return;
                                        }

                                        // Extract tokens
                                        if let (Some(access_token), Some(refresh_token)) =
                                            (params.get("access_token"), params.get("refresh_token")) {

                                            let payload = serde_json::json!({
                                                "access_token": access_token.to_string(),
                                                "refresh_token": refresh_token.to_string(),
                                                "user_id": params.get("user_id").map(|s| s.to_string()),
                                                "email": params.get("email").map(|s| s.to_string()),
                                            });

                                            println!("Emitting auth-success event");
                                            let _ = handle.emit("auth-success", payload);
                                        } else {
                                            eprintln!("Missing tokens in deep link");
                                            let _ = handle.emit("auth-error", "Missing authentication tokens");
                                        }
                                    }
                                }
                            }
                        });
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to register deep links: {}. Auth will not work via deep links.", e);
                        // Continue anyway - app will still work, just without deep link auth
                    }
                }
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
            auth::save_auth_credentials,
            auth::get_auth_credentials,
            auth::delete_auth_credentials,
            auth::is_authenticated,
            auth::start_auth_flow,
            langpack::get_lemma,
            langpack::get_translation,
            langpack::lemmatize_batch,
            langpack::translate_batch,
            langpack::process_words,
            vocabulary::record_word,
            vocabulary::get_user_vocab,
            vocabulary::is_new_word,
            vocabulary::get_vocab_stats,
            vocabulary::clean_vocab_punctuation,
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
            sessions::get_all_sessions_command,
            sessions::get_session_command,
            sessions::get_sessions_by_language_command,
            sessions::get_session_words_command,
            sessions::delete_session_command,
            text_library::create_text_library_item_command,
            text_library::get_text_library_item_command,
            text_library::get_all_text_library_items_command,
            text_library::get_text_library_by_language_command,
            text_library::update_text_library_item_command,
            text_library::delete_text_library_item_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}