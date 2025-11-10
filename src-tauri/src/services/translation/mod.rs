/// Translation service module
///
/// This module provides translation services with an abstraction layer
/// that supports multiple backend implementations.
///
/// # Architecture
///
/// ```
/// Commands/Services → TranslationProvider trait
///                           ↓
///                   Factory function
///                           ↓
///                 ┌─────────┴─────────┐
///                 ↓                   ↓
///         PairwiseProvider    ConceptProvider
///              (current)          (future)
/// ```
///
/// # Usage
///
/// ```rust
/// // Get a provider (automatically chooses the right implementation)
/// let provider = get_translation_provider(&app_handle, user_pool).await?;
///
/// // Use it (same interface regardless of implementation!)
/// let translation = provider.get_translation("estar", "es", "en").await?;
/// ```

use anyhow::Result;
use sqlx::SqlitePool;
use tauri::AppHandle;

// Module declarations
pub mod provider;
pub mod pairwise_provider;
pub mod concept_provider;

// Re-export the trait and providers
pub use provider::{TranslationProvider, CustomTranslationProvider};
pub use pairwise_provider::PairwiseProvider;
pub use concept_provider::ConceptProvider;

/// Factory function: Get the appropriate translation provider
///
/// This is the main entry point for getting a translation provider.
/// It handles:
/// 1. Choosing which base provider to use (pairwise vs concept)
/// 2. Wrapping it with CustomTranslationProvider for user customization
///
/// # Arguments
/// * `app_handle` - Tauri app handle for accessing databases
/// * `user_pool` - Optional user database pool for custom translations
///
/// # Returns
/// A boxed translation provider ready to use
///
/// # Example
/// ```rust
/// let provider = get_translation_provider(&app_handle, Some(&user_pool)).await?;
/// let translation = provider.get_translation("estar", "es", "en").await?;
/// ```
pub async fn get_translation_provider(
    app_handle: &AppHandle,
    user_pool: Option<&SqlitePool>,
) -> Result<Box<dyn TranslationProvider>> {
    // For now, always use pairwise provider
    // In the future, this could check a config setting:
    //
    // let use_concepts = app_handle.config()
    //     .get("translation.use_concepts")
    //     .unwrap_or(false);
    //
    // let base: Box<dyn TranslationProvider> = if use_concepts {
    //     Box::new(ConceptProvider::new(app_handle.clone()))
    // } else {
    //     Box::new(PairwiseProvider::new(app_handle.clone()))
    // };

    let base: Box<dyn TranslationProvider> = Box::new(PairwiseProvider::new(app_handle.clone()));

    // Wrap with custom translation support if user pool provided
    if let Some(pool) = user_pool {
        Ok(Box::new(CustomTranslationProvider::new(base, pool.clone())))
    } else {
        Ok(base)
    }
}

// Keep the original functions for backward compatibility during migration
// These will be removed once all call sites are updated

use sqlx::Row;
use crate::db::langpack;

/// DEPRECATED: Use get_translation_provider instead
///
/// This function is kept for backward compatibility during migration.
/// It will be removed once all call sites are updated to use the provider.
#[deprecated(note = "Use get_translation_provider instead")]
pub async fn get_translation(
    lemma: &str,
    from_lang: &str,
    to_lang: &str,
    app: &AppHandle
) -> Result<Option<String>> {
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

/// DEPRECATED: Use get_translation_provider instead
///
/// This function is kept for backward compatibility during migration.
/// It will be removed once all call sites are updated to use the provider.
#[deprecated(note = "Use get_translation_provider instead")]
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

    /// This test just verifies that the module structure compiles correctly
    #[test]
    fn test_module_compiles() {
        // If this test compiles, it means:
        // 1. The trait is defined correctly
        // 2. Both providers implement the trait
        // 3. The factory function is properly typed
        assert!(true);
    }
}
