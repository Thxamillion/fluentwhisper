use anyhow::Result;
use sqlx::{Row, SqlitePool};
use tauri::AppHandle;

use crate::db::langpack;

/// Looks up translation for a lemma (base form of word)
///
/// # Arguments
/// * `lemma` - The base form of the word (e.g., "estar", "run")
/// * `from_lang` - Source language code (e.g., "es")
/// * `to_lang` - Target language code (e.g., "en")
/// * `app` - Tauri app handle for path resolution
///
/// # Returns
/// * `Some(translation)` if found (e.g., "to be")
/// * `None` if no translation exists in database
///
/// # Example
/// ```
/// let translation = get_translation("estar", "es", "en", &app).await?;
/// assert_eq!(translation, Some("to be".to_string()));
/// ```
pub async fn get_translation(lemma: &str, from_lang: &str, to_lang: &str, app: &AppHandle) -> Result<Option<String>> {
    let pool = langpack::open_translation_db(from_lang, to_lang, app).await?;

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
/// Checks custom user translations first, then falls back to official translation database.
///
/// # Arguments
/// * `lemmas` - List of lemmas to translate
/// * `from_lang` - Source language code
/// * `to_lang` - Target language code
/// * `user_pool` - Optional user database pool for checking custom translations
///
/// # Returns
/// Vector of (lemma, translation) tuples.
/// If a lemma has no translation, the translation will be None.
///
/// # Example
/// ```
/// let lemmas = vec!["estar", "correr", "casa"];
/// let translations = translate_batch(&lemmas, "es", "en", None).await?;
/// // Returns: [("estar", Some("to be")), ("correr", Some("to run")), ...]
/// ```
pub async fn translate_batch(
    lemmas: &[String],
    from_lang: &str,
    to_lang: &str,
    user_pool: Option<&SqlitePool>,
    app: &AppHandle,
) -> Result<Vec<(String, Option<String>)>> {
    println!("[translate_batch] from_lang={}, to_lang={}, lemmas={:?}", from_lang, to_lang, lemmas);

    let mut results = Vec::with_capacity(lemmas.len());
    let mut remaining_lemmas = Vec::new();

    // 1. Check custom translations if user pool provided
    if let Some(pool) = user_pool {
        println!("[translate_batch] Checking custom translations first");

        for lemma in lemmas {
            // Check custom translation
            let custom = sqlx::query_scalar::<_, String>(
                "SELECT custom_translation FROM custom_translations
                 WHERE lemma = ? AND lang_from = ? AND lang_to = ?"
            )
            .bind(lemma)
            .bind(from_lang)
            .bind(to_lang)
            .fetch_optional(pool)
            .await?;

            match custom {
                Some(translation) => {
                    println!("[translate_batch] Found custom translation for '{}': '{}'", lemma, translation);
                    results.push((lemma.clone(), Some(translation)));
                }
                None => {
                    // No custom translation, need to check official DB
                    remaining_lemmas.push(lemma);
                }
            }
        }
    } else {
        // No user pool, all lemmas need official lookup
        remaining_lemmas = lemmas.iter().collect();
    }

    // 2. Query official translations for remaining lemmas
    if !remaining_lemmas.is_empty() {
        let pool = langpack::open_translation_db(from_lang, to_lang, app).await?;
        println!("[translate_batch] Checking official translations for {} remaining lemmas", remaining_lemmas.len());

        for lemma in remaining_lemmas {
            let lemma_lower = lemma.to_lowercase();

            println!("[translate_batch] Querying: lemma_from='{}', lang_from='{}', lang_to='{}'",
                     lemma_lower, from_lang, to_lang);

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
                    println!("[translate_batch] Found official translation for '{}': '{}'", lemma, trans);
                    Some(trans)
                }
                None => {
                    println!("[translate_batch] No translation found for '{}'", lemma);
                    None
                }
            };

            results.push((lemma.clone(), translation));
        }
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

        let result = translate_batch(&lemmas, "es", "en", None).await;
        assert!(result.is_ok());

        let translations = result.unwrap();
        assert_eq!(translations.len(), 3);

        // estar should have a translation
        assert!(translations[0].1.is_some());

        // correr should have a translation
        assert!(translations[1].1.is_some());
    }
}
