/// Translation provider abstraction
///
/// This trait defines the interface for translation services, allowing
/// different implementations (pairwise databases, concept-based, etc.)
/// without changing the rest of the codebase.
///
/// # Design Pattern
/// This is the Strategy Pattern - we define an interface that hides
/// implementation details from callers. This allows us to:
/// - Swap implementations easily (pairwise ↔ concept-based)
/// - Test with mock providers
/// - Support multiple backends simultaneously
///
/// # Why This Exists
/// Currently we use pairwise translation databases (es-en.db, es-fr.db).
/// In the future, we may want concept-based translation where all languages
/// map to universal concept IDs. This abstraction makes that migration
/// much easier - we only need to change which provider we instantiate.

use anyhow::Result;
use async_trait::async_trait;

/// Core translation interface
///
/// All translation providers must implement these methods.
/// The interface is designed to work with both pairwise and concept-based systems.
///
/// Note: We use async_trait because we need `dyn TranslationProvider` support.
/// Native async in traits (Rust 1.75+) doesn't work with trait objects yet.
#[async_trait]
pub trait TranslationProvider: Send + Sync {
    /// Get translation for a single lemma
    ///
    /// # Arguments
    /// * `lemma` - The base form of the word (e.g., "estar", "run")
    /// * `from_lang` - Source language code (e.g., "es")
    /// * `to_lang` - Target language code (e.g., "en")
    ///
    /// # Returns
    /// * `Some(translation)` if found (e.g., "to be")
    /// * `None` if no translation exists
    ///
    /// # Example
    /// ```
    /// let translation = provider.get_translation("estar", "es", "en").await?;
    /// assert_eq!(translation, Some("to be".to_string()));
    /// ```
    async fn get_translation(
        &self,
        lemma: &str,
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Option<String>>;

    /// Translate a batch of lemmas
    ///
    /// More efficient than calling get_translation repeatedly.
    /// Implementations may optimize batch queries.
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
    /// let lemmas = vec!["estar".to_string(), "correr".to_string()];
    /// let translations = provider.translate_batch(&lemmas, "es", "en").await?;
    /// // Returns: [("estar", Some("to be")), ("correr", Some("to run"))]
    /// ```
    async fn translate_batch(
        &self,
        lemmas: &[String],
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Vec<(String, Option<String>)>>;
}

/// Composite provider that checks custom translations first
///
/// This wrapper adds user customization support to any base provider.
/// It checks the user's custom_translations table before delegating
/// to the underlying provider.
///
/// # Example Flow
/// ```
/// User lookup: "estar" (es → en)
///   1. Check custom_translations table
///   2. If not found, delegate to base provider (pairwise/concept)
///   3. Return result
/// ```
pub struct CustomTranslationProvider {
    /// The underlying translation provider (pairwise, concept, etc.)
    base_provider: Box<dyn TranslationProvider>,
    /// User database pool for custom translations
    user_pool: sqlx::SqlitePool,
}

impl CustomTranslationProvider {
    /// Create a new custom translation provider
    ///
    /// # Arguments
    /// * `base_provider` - The underlying provider to delegate to
    /// * `user_pool` - User database containing custom_translations table
    pub fn new(base_provider: Box<dyn TranslationProvider>, user_pool: sqlx::SqlitePool) -> Self {
        Self {
            base_provider,
            user_pool,
        }
    }
}

#[async_trait]
impl TranslationProvider for CustomTranslationProvider {
    async fn get_translation(
        &self,
        lemma: &str,
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Option<String>> {
        // 1. Check custom translations first
        let custom: Option<String> = sqlx::query_scalar(
            "SELECT custom_translation FROM custom_translations
             WHERE lemma = ? AND lang_from = ? AND lang_to = ?"
        )
        .bind(lemma)
        .bind(from_lang)
        .bind(to_lang)
        .fetch_optional(&self.user_pool)
        .await?;

        if custom.is_some() {
            return Ok(custom);
        }

        // 2. Fall back to base provider
        self.base_provider.get_translation(lemma, from_lang, to_lang).await
    }

    async fn translate_batch(
        &self,
        lemmas: &[String],
        from_lang: &str,
        to_lang: &str,
    ) -> Result<Vec<(String, Option<String>)>> {
        let mut results = Vec::with_capacity(lemmas.len());
        let mut remaining_lemmas = Vec::new();

        // 1. Check custom translations
        for lemma in lemmas {
            let custom: Option<String> = sqlx::query_scalar(
                "SELECT custom_translation FROM custom_translations
                 WHERE lemma = ? AND lang_from = ? AND lang_to = ?"
            )
            .bind(lemma)
            .bind(from_lang)
            .bind(to_lang)
            .fetch_optional(&self.user_pool)
            .await?;

            match custom {
                Some(translation) => {
                    results.push((lemma.clone(), Some(translation)));
                }
                None => {
                    remaining_lemmas.push(lemma);
                }
            }
        }

        // 2. Query base provider for remaining lemmas
        if !remaining_lemmas.is_empty() {
            let base_results = self.base_provider
                .translate_batch(&remaining_lemmas.iter().map(|s| s.to_string()).collect::<Vec<_>>(), from_lang, to_lang)
                .await?;

            results.extend(base_results);
        }

        Ok(results)
    }
}
