use crate::services::lemmatization;

/// Tauri command: Get lemma (base form) for a word
///
/// Called from TypeScript: `invoke('get_lemma', { word: 'estás', lang: 'es' })`
#[tauri::command]
pub async fn get_lemma(app_handle: tauri::AppHandle, word: String, lang: String) -> Result<Option<String>, String> {
    lemmatization::get_lemma(&word, &lang, &app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// Tauri command: Lemmatize a batch of words
///
/// More efficient for processing transcripts.
///
/// Called from TypeScript:
/// `invoke('lemmatize_batch', { words: ['estoy', 'corriendo'], lang: 'es' })`
///
/// Returns: Array of [originalWord, lemma] tuples
#[tauri::command]
pub async fn lemmatize_batch(app_handle: tauri::AppHandle, words: Vec<String>, lang: String) -> Result<Vec<(String, String)>, String> {
    lemmatization::lemmatize_batch(&words, &lang, &app_handle)
        .await
        .map_err(|e| e.to_string())
}
