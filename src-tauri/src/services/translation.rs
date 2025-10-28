use anyhow::Result;
use sqlx::Row;

use crate::db::langpack;

/// Looks up translation for a lemma (base form of word)
///
/// # Arguments
/// * `lemma` - The base form of the word (e.g., "estar", "run")
/// * `from_lang` - Source language code (e.g., "es")
/// * `to_lang` - Target language code (e.g., "en")
///
/// # Returns
/// * `Some(translation)` if found (e.g., "to be")
/// * `None` if no translation exists in database
///
/// # Example
/// ```
/// let translation = get_translation("estar", "es", "en").await?;
/// assert_eq!(translation, Some("to be".to_string()));
/// ```
pub async fn get_translation(lemma: &str, from_lang: &str, to_lang: &str) -> Result<Option<String>> {
    let pool = langpack::open_translation_db(from_lang, to_lang).await?;

    let lemma_lower = lemma.to_lowercase();

    let result = sqlx::query(
        "SELECT translation FROM translations
         WHERE lemma_from = ? AND lang_from = ? AND lang_to = ?
         ORDER BY id ASC
         LIMIT 1"
    )
    .bind(&lemma_lower)
    .bind(from_lang)
    .bind(to_lang)
    .fetch_optional(&pool)
    .await?;

    match result {
        Some(row) => {
            let translation: String = row.try_get("translation")?;
            Ok(Some(translation))
        }
        None => Ok(None),
    }
}

/// Translates a batch of lemmas
///
/// More efficient than calling get_translation repeatedly.
///
/// # Arguments
/// * `lemmas` - List of lemmas to translate
/// * `from_lang` - Source language code
/// * `to_lang` - Target language code
///
/// # Returns
/// Vector of (lemma, translation) tuples.
/// If a lemma has no translation, the translation will be None.
///
/// # Example
/// ```
/// let lemmas = vec!["estar", "correr", "casa"];
/// let translations = translate_batch(&lemmas, "es", "en").await?;
/// // Returns: [("estar", Some("to be")), ("correr", Some("to run")), ...]
/// ```
pub async fn translate_batch(
    lemmas: &[String],
    from_lang: &str,
    to_lang: &str,
) -> Result<Vec<(String, Option<String>)>> {
    let pool = langpack::open_translation_db(from_lang, to_lang).await?;

    let mut results = Vec::with_capacity(lemmas.len());

    for lemma in lemmas {
        let lemma_lower = lemma.to_lowercase();

        let result = sqlx::query(
            "SELECT translation FROM translations
             WHERE lemma_from = ? AND lang_from = ? AND lang_to = ?
             ORDER BY id ASC
             LIMIT 1"
        )
        .bind(&lemma_lower)
        .bind(from_lang)
        .bind(to_lang)
        .fetch_optional(&pool)
        .await?;

        let translation = match result {
            Some(row) => {
                let trans: String = row.try_get("translation")?;
                Some(trans)
            }
            None => None,
        };

        results.push((lemma.clone(), translation));
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_translation_spanish_to_english() {
        let result = get_translation("estar", "es", "en").await;
        assert!(result.is_ok());

        let translation = result.unwrap();
        assert!(translation.is_some());

        // Translation should contain "be" (exact format may vary)
        let trans = translation.unwrap();
        assert!(trans.contains("be"));
    }

    #[tokio::test]
    async fn test_get_translation_not_found() {
        // Made-up word should not have translation
        let result = get_translation("xyzabc123", "es", "en").await;
        assert!(result.is_ok());

        let translation = result.unwrap();
        assert_eq!(translation, None);
    }

    #[tokio::test]
    async fn test_translate_batch() {
        let lemmas = vec![
            "estar".to_string(),
            "correr".to_string(),
            "casa".to_string(),
        ];

        let result = translate_batch(&lemmas, "es", "en").await;
        assert!(result.is_ok());

        let translations = result.unwrap();
        assert_eq!(translations.len(), 3);

        // estar should have a translation
        assert!(translations[0].1.is_some());

        // correr should have a translation
        assert!(translations[1].1.is_some());
    }
}
