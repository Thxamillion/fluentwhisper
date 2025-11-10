/// Pairwise translation provider
///
/// This is the CURRENT implementation - uses pairwise language databases.
/// Files like: es-en.db, es-fr.db, fr-de.db
///
/// Schema:
/// ```sql
/// CREATE TABLE translations (
///   id INTEGER,
///   lemma_from TEXT,
///   lang_from TEXT,
///   lang_to TEXT,
///   translation TEXT
/// )
/// ```
///
/// This implementation is extracted from the original translation.rs code.

use anyhow::Result;
use async_trait::async_trait;
use sqlx::Row;
use tauri::AppHandle;

use super::provider::TranslationProvider;
use crate::db::langpack;

/// Pairwise translation provider
///
/// Uses downloaded language pack databases with pairwise mappings.
/// Each language pair requires its own database file.
///
/// # Example
/// ```
/// let provider = PairwiseProvider::new(app_handle);
/// let translation = provider.get_translation("estar", "es", "en").await?;
/// ```
pub struct PairwiseProvider {
    app_handle: AppHandle,
}

impl PairwiseProvider {
    /// Create a new pairwise provider
    ///
    /// # Arguments
    /// * `app_handle` - Tauri app handle for accessing language pack databases
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

#[async_trait]
impl TranslationProvider for PairwiseProvider {
    /// Get translation using pairwise database
    ///
    /// This is the original implementation from translation.rs::get_translation
    async fn get_translation(
        &self,
        lemma: &str,
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Option<String>> {
        let pool = langpack::open_translation_db(from_lang, to_lang, &self.app_handle).await?;

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

    /// Translate batch using pairwise database
    ///
    /// This is the original implementation from translation.rs::translate_batch
    /// (without the custom translation check - that's handled by CustomTranslationProvider wrapper)
    async fn translate_batch(
        &self,
        lemmas: &[String],
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Vec<(String, Option<String>)>> {
        println!("[PairwiseProvider::translate_batch] from_lang={}, to_lang={}, lemmas={:?}", from_lang, to_lang, lemmas);

        let pool = langpack::open_translation_db(from_lang, to_lang, &self.app_handle).await?;
        let mut results = Vec::with_capacity(lemmas.len());

        for lemma in lemmas {
            let lemma_lower = lemma.to_lowercase();

            println!("[PairwiseProvider] Querying: lemma_from='{}', lang_from='{}', lang_to='{}'",
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
                    println!("[PairwiseProvider] Found translation for '{}': '{}'", lemma, trans);
                    Some(trans)
                }
                None => {
                    println!("[PairwiseProvider] No translation found for '{}'", lemma);
                    None
                }
            };

            results.push((lemma.clone(), translation));
        }

        Ok(results)
    }
}
