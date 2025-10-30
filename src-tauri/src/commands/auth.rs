use keyring::Entry;
use serde::{Deserialize, Serialize};

/// Service name for keyring storage
const SERVICE_NAME: &str = "com.fluentdiary.app";

/// Supabase configuration
const SUPABASE_URL: &str = "https://xtflvvyitebirnsafvrm.supabase.co";
const DESKTOP_CALLBACK_URL: &str = "https://xtflvvyitebirnsafvrm.supabase.co/desktop-auth-callback";

/// Credentials stored in the system keychain
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: String,
}

/// Error types for auth operations
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Failed to access keychain: {0}")]
    KeychainError(String),

    #[error("No credentials found")]
    NoCredentials,

    #[error("Invalid credentials format: {0}")]
    InvalidFormat(String),
}

impl From<keyring::Error> for AuthError {
    fn from(err: keyring::Error) -> Self {
        AuthError::KeychainError(err.to_string())
    }
}

/// Get keyring entry for auth tokens
fn get_entry() -> Result<Entry, AuthError> {
    Entry::new(SERVICE_NAME, "auth_tokens")
        .map_err(|e| AuthError::KeychainError(e.to_string()))
}

/// Save authentication credentials to system keychain
#[tauri::command]
pub async fn save_auth_credentials(
    access_token: String,
    refresh_token: String,
    user_id: String,
    email: String,
) -> Result<(), String> {
    let credentials = AuthCredentials {
        access_token,
        refresh_token,
        user_id,
        email,
    };

    let json = serde_json::to_string(&credentials)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    let entry = get_entry()
        .map_err(|e| e.to_string())?;

    entry.set_password(&json)
        .map_err(|e| format!("Failed to save credentials: {}", e))?;

    Ok(())
}

/// Get authentication credentials from system keychain
#[tauri::command]
pub async fn get_auth_credentials() -> Result<AuthCredentials, String> {
    let entry = get_entry()
        .map_err(|e| e.to_string())?;

    let json = entry.get_password()
        .map_err(|e| {
            if matches!(e, keyring::Error::NoEntry) {
                "No credentials found".to_string()
            } else {
                format!("Failed to retrieve credentials: {}", e)
            }
        })?;

    let credentials: AuthCredentials = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse credentials: {}", e))?;

    Ok(credentials)
}

/// Delete authentication credentials from system keychain
#[tauri::command]
pub async fn delete_auth_credentials() -> Result<(), String> {
    let entry = get_entry()
        .map_err(|e| e.to_string())?;

    // Delete credentials, but ignore NoEntry error (already deleted)
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted, not an error
        Err(e) => Err(format!("Failed to delete credentials: {}", e))
    }
}

/// Check if user is authenticated (has valid credentials)
#[tauri::command]
pub async fn is_authenticated() -> Result<bool, String> {
    match get_auth_credentials().await {
        Ok(_) => Ok(true),
        Err(e) => {
            if e.contains("No credentials found") {
                Ok(false)
            } else {
                Err(e)
            }
        }
    }
}

/// Start OAuth authentication flow by opening the browser
#[tauri::command]
pub async fn start_auth_flow() -> Result<(), String> {
    // Build Supabase OAuth URL
    let auth_url = format!(
        "{}/auth/v1/authorize?provider=google&redirect_to={}",
        SUPABASE_URL,
        urlencoding::encode(DESKTOP_CALLBACK_URL)
    );

    // Open browser with OAuth URL
    open::that(&auth_url)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_credential_lifecycle() {
        // Clean up any existing credentials
        let _ = delete_auth_credentials().await;

        // Should not be authenticated
        let is_auth = is_authenticated().await.unwrap();
        assert!(!is_auth);

        // Save credentials
        let result = save_auth_credentials(
            "test_access_token".to_string(),
            "test_refresh_token".to_string(),
            "test_user_id".to_string(),
            "test@example.com".to_string(),
        ).await;
        assert!(result.is_ok());

        // Should be authenticated now
        let is_auth = is_authenticated().await.unwrap();
        assert!(is_auth);

        // Retrieve credentials
        let creds = get_auth_credentials().await.unwrap();
        assert_eq!(creds.access_token, "test_access_token");
        assert_eq!(creds.refresh_token, "test_refresh_token");
        assert_eq!(creds.user_id, "test_user_id");
        assert_eq!(creds.email, "test@example.com");

        // Delete credentials
        let result = delete_auth_credentials().await;
        assert!(result.is_ok());

        // Should not be authenticated
        let is_auth = is_authenticated().await.unwrap();
        assert!(!is_auth);

        // Getting credentials should fail
        let result = get_auth_credentials().await;
        assert!(result.is_err());
    }
}
