use anyhow::Result;
use sqlx::Row;
use tauri::AppHandle;

use crate::db::langpack;

/// Looks up the lemma (base form) for a given word
///
/// # Arguments
/// * `word` - The inflected word form (e.g., "estás", "running")
/// * `lang` - Language code (e.g., "es", "en")
/// * `app` - Tauri app handle for path resolution
///
/// # Returns
/// * `Some(lemma)` if found in database (e.g., "estar", "run")
/// * `None` if not found (word is likely already in base form)
///
/// # Example
/// ```
/// let lemma = get_lemma("estás", "es", &app).await?;
/// assert_eq!(lemma, Some("estar".to_string()));
/// ```
pub async fn get_lemma(word: &str, lang: &str, app: &AppHandle) -> Result<Option<String>> {
    let pool = langpack::open_lemma_db(lang, app).await?;

    let word_lower = word.to_lowercase();

    let result = sqlx::query("SELECT lemma FROM lemmas WHERE word = ?")
        .bind(&word_lower)
        .fetch_optional(&pool)
        .await?;

    match result {
        Some(row) => {
            let lemma: String = row.try_get("lemma")?;
            Ok(Some(lemma))
        }
        None => Ok(None),
    }
}

/// Lemmatizes a list of words in batch
///
/// More efficient than calling get_lemma repeatedly.
///
/// # Arguments
/// * `words` - List of words to lemmatize
/// * `lang` - Language code
/// * `app` - Tauri app handle for path resolution
///
/// # Returns
/// Vector of (original_word, lemma) tuples.
/// If a word has no lemma mapping, the lemma will be the original word.
///
/// # Example
/// ```
/// let words = vec!["estoy", "corriendo", "casa"];
/// let lemmas = lemmatize_batch(&words, "es", &app).await?;
/// // Returns: [("estoy", "estar"), ("corriendo", "correr"), ("casa", "casa")]
/// ```
pub async fn lemmatize_batch(words: &[String], lang: &str, app: &AppHandle) -> Result<Vec<(String, String)>> {
    let pool = langpack::open_lemma_db(lang, app).await?;

    let mut results = Vec::with_capacity(words.len());

    for word in words {
        let word_lower = word.to_lowercase();

        let result = sqlx::query("SELECT lemma FROM lemmas WHERE word = ?")
            .bind(&word_lower)
            .fetch_optional(&pool)
            .await?;

        let lemma = match result {
            Some(row) => row.try_get("lemma")?,
            None => word_lower.clone(), // Word is already base form
        };

        results.push((word.clone(), lemma));
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    // TODO: These tests require proper AppHandle mocking and lemma database setup.
    // They should be re-enabled with integration test infrastructure.
    //
    // #[tokio::test]
    // async fn test_get_lemma_spanish_verb() {
    //     let result = get_lemma("estás", "es", &app).await;
    //     assert!(result.is_ok());
    //
    //     let lemma = result.unwrap();
    //     assert_eq!(lemma, Some("estar".to_string()));
    // }
    //
    // #[tokio::test]
    // async fn test_get_lemma_not_found() {
    //     // Base form should not be in database
    //     let result = get_lemma("estar", "es", &app).await;
    //     assert!(result.is_ok());
    //
    //     let lemma = result.unwrap();
    //     assert_eq!(lemma, None);
    // }
    //
    // #[tokio::test]
    // async fn test_lemmatize_batch() {
    //     let words = vec![
    //         "estoy".to_string(),
    //         "corriendo".to_string(),
    //         "casa".to_string(),
    //     ];
    //
    //     let result = lemmatize_batch(&words, "es", &app).await;
    //     assert!(result.is_ok());
    //
    //     let lemmas = result.unwrap();
    //     assert_eq!(lemmas.len(), 3);
    //
    //     // estoy should map to estar
    //     assert_eq!(lemmas[0].1, "estar");
    //
    //     // corriendo should map to correr
    //     assert_eq!(lemmas[1].1, "correr");
    // }
}
