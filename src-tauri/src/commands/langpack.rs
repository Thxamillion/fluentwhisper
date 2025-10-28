use crate::services::{lemmatization, translation};

/// Tauri command: Get lemma (base form) for a word
///
/// Called from TypeScript: `invoke('get_lemma', { word: 'estás', lang: 'es' })`
#[tauri::command]
pub async fn get_lemma(word: String, lang: String) -> Result<Option<String>, String> {
    lemmatization::get_lemma(&word, &lang)
        .await
        .map_err(|e| e.to_string())
}

/// Tauri command: Get translation for a lemma
///
/// Called from TypeScript:
/// `invoke('get_translation', { lemma: 'estar', fromLang: 'es', toLang: 'en' })`
#[tauri::command]
pub async fn get_translation(
    lemma: String,
    from_lang: String,
    to_lang: String,
) -> Result<Option<String>, String> {
    translation::get_translation(&lemma, &from_lang, &to_lang)
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
pub async fn lemmatize_batch(words: Vec<String>, lang: String) -> Result<Vec<(String, String)>, String> {
    lemmatization::lemmatize_batch(&words, &lang)
        .await
        .map_err(|e| e.to_string())
}

/// Tauri command: Translate a batch of lemmas
///
/// More efficient for processing multiple words.
///
/// Called from TypeScript:
/// `invoke('translate_batch', { lemmas: ['estar', 'correr'], fromLang: 'es', toLang: 'en' })`
///
/// Returns: Array of [lemma, translation | null] tuples
#[tauri::command]
pub async fn translate_batch(
    lemmas: Vec<String>,
    from_lang: String,
    to_lang: String,
) -> Result<Vec<(String, Option<String>)>, String> {
    translation::translate_batch(&lemmas, &from_lang, &to_lang)
        .await
        .map_err(|e| e.to_string())
}

/// Tauri command: Full pipeline - lemmatize + translate words
///
/// Convenience command that does both steps at once.
///
/// Called from TypeScript:
/// `invoke('process_words', { words: ['estoy', 'corriendo'], lang: 'es', targetLang: 'en' })`
///
/// Returns: Array of { word, lemma, translation } objects
#[tauri::command]
pub async fn process_words(
    words: Vec<String>,
    lang: String,
    target_lang: String,
) -> Result<Vec<WordResult>, String> {
    // Step 1: Lemmatize all words
    let lemma_results = lemmatization::lemmatize_batch(&words, &lang)
        .await
        .map_err(|e| e.to_string())?;

    // Step 2: Extract unique lemmas for translation
    let lemmas: Vec<String> = lemma_results.iter().map(|(_, lemma)| lemma.clone()).collect();

    // Step 3: Translate lemmas
    let translation_results = translation::translate_batch(&lemmas, &lang, &target_lang)
        .await
        .map_err(|e| e.to_string())?;

    // Step 4: Combine results
    let mut results = Vec::with_capacity(words.len());

    for (i, (word, lemma)) in lemma_results.iter().enumerate() {
        let translation = translation_results
            .get(i)
            .and_then(|(_, trans)| trans.clone());

        results.push(WordResult {
            word: word.clone(),
            lemma: lemma.clone(),
            translation,
        });
    }

    Ok(results)
}

/// Result structure for process_words command
#[derive(serde::Serialize)]
pub struct WordResult {
    pub word: String,
    pub lemma: String,
    pub translation: Option<String>,
}
