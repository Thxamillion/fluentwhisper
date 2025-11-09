use std::net::TcpListener;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use url::Url;
use std::process::Command;

const OAUTH_PORT: u16 = 54321; // Fixed port for OAuth callbacks

/// Attempts to free the OAuth port by killing any process using it
fn cleanup_port() {
    #[cfg(unix)]
    {
        let _ = Command::new("sh")
            .arg("-c")
            .arg(format!("lsof -ti:{} | xargs kill -9 2>/dev/null || true", OAUTH_PORT))
            .output();
    }
}

/// Starts a temporary localhost server to catch OAuth callback on fixed port
/// Returns the callback URL when received
pub fn start_oauth_server_and_wait() -> Result<String, String> {
    // Try to bind to fixed port, with automatic cleanup if already in use
    let mut listener = match TcpListener::bind(format!("127.0.0.1:{}", OAUTH_PORT)) {
        Ok(listener) => listener,
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
            println!("[OAuth] Port {} is in use, attempting to clean up...", OAUTH_PORT);
            cleanup_port();
            // Wait a moment for the port to be freed
            thread::sleep(Duration::from_millis(500));
            // Try again after cleanup
            TcpListener::bind(format!("127.0.0.1:{}", OAUTH_PORT))
                .map_err(|e| {
                    format!("Port {} is still in use after cleanup. Please manually run: lsof -ti:{} | xargs kill -9", OAUTH_PORT, OAUTH_PORT)
                })?
        },
        Err(e) => {
            return Err(format!("Failed to bind to localhost:{} - {}", OAUTH_PORT, e));
        }
    };

    println!("[OAuth] Server listening on port {}", OAUTH_PORT);

    let callback_url = Arc::new(Mutex::new(None::<String>));
    let callback_url_clone = callback_url.clone();

    // Spawn thread to handle incoming requests (need to handle 2: initial + redirect)
    let listener_clone = listener.try_clone()
        .map_err(|e| format!("Failed to clone listener: {}", e))?;

    thread::spawn(move || {
        // Keep accepting connections until we get one with tokens
        let mut attempt = 0;
        loop {
            attempt += 1;
            if let Ok((mut stream, _)) = listener_clone.accept() {
                println!("[OAuth] Received connection #{}", attempt);
                let mut buffer = [0; 4096];
                if let Ok(size) = stream.read(&mut buffer) {
                    let request = String::from_utf8_lossy(&buffer[..size]);

                    // Extract the full URL from the GET request
                    if let Some(first_line) = request.lines().next() {
                        if let Some(path) = first_line.split_whitespace().nth(1) {
                            println!("[OAuth] Callback path: {}", path);

                            // Only store if it has query params (tokens)
                            // First request will be just "/callback" (no tokens)
                            // Second request will be "/callback?access_token=..." (has tokens)
                            if path.contains('?') {
                                println!("[OAuth] Found query params, storing callback");
                                if let Ok(mut url) = callback_url_clone.lock() {
                                    *url = Some(path.to_string());
                                }
                                // Send success response and close gracefully
                                let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<html><body><h1>✓ Done</h1><p>You can close this window.</p><script>setTimeout(() => window.close(), 1000);</script></body></html>";
                                let _ = stream.write_all(response.as_bytes());
                                let _ = stream.flush();
                                // Give browser time to receive response
                                thread::sleep(Duration::from_millis(100));
                                return; // Exit thread
                            } else {
                                println!("[OAuth] No query params yet, waiting for redirect");
                                // Send HTML with JavaScript to extract hash and redirect
                                let response = "HTTP/1.1 200 OK\r\n\
                                    Content-Type: text/html\r\n\
                                    \r\n\
                                    <html>\
                                    <head><title>Authentication Successful</title></head>\
                                    <body style='font-family: system-ui; text-align: center; padding: 50px;'>\
                                    <h1>✓ Authentication Successful</h1>\
                                    <p>Processing authentication...</p>\
                                    <script>\
                                    // Extract tokens from hash fragment (Supabase puts them there)\
                                    const hash = window.location.hash.substring(1);\
                                    if (hash) {\
                                        // Redirect to same URL but with tokens in query params\
                                        window.location.href = '/callback?' + hash;\
                                    } else {\
                                        document.body.innerHTML = '<h1>Error</h1><p>No tokens found.</p>';\
                                    }\
                                    </script>\
                                    </body>\
                                    </html>";
                                let _ = stream.write_all(response.as_bytes());
                                let _ = stream.flush();
                            }
                        }
                    }
                }
            }
        }
    });

    // Wait for the callback (max 2 minutes)
    for i in 0..240 {
        thread::sleep(Duration::from_millis(500));
        if let Ok(url) = callback_url.lock() {
            if let Some(ref callback) = *url {
                println!("[OAuth] Callback received after {} seconds", i / 2);
                return Ok(callback.clone());
            }
        }
    }

    Err("OAuth callback timeout - no response received after 2 minutes".to_string())
}

/// Parse OAuth tokens from callback URL
pub fn parse_oauth_callback(callback_url: &str) -> Result<(String, String), String> {
    println!("[OAuth] Parsing callback URL: {}", callback_url);

    // Parse URL - it might be just the path or full URL
    let url_str = if callback_url.starts_with("http") {
        callback_url.to_string()
    } else {
        format!("http://localhost{}", callback_url)
    };

    let url = Url::parse(&url_str)
        .map_err(|e| format!("Failed to parse callback URL: {}", e))?;

    // Try to get tokens from query params first
    let mut access_token = None;
    let mut refresh_token = None;

    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "access_token" => {
                println!("[OAuth] Found access_token in query");
                access_token = Some(value.to_string());
            },
            "refresh_token" => {
                println!("[OAuth] Found refresh_token in query");
                refresh_token = Some(value.to_string());
            },
            _ => {}
        }
    }

    // If not in query, try hash fragment (Supabase implicit flow)
    if access_token.is_none() {
        if let Some(fragment) = url.fragment() {
            println!("[OAuth] Checking fragment: {}", fragment);
            let fragment_url = Url::parse(&format!("http://localhost?{}", fragment))
                .map_err(|e| format!("Failed to parse fragment: {}", e))?;

            for (key, value) in fragment_url.query_pairs() {
                match key.as_ref() {
                    "access_token" => {
                        println!("[OAuth] Found access_token in fragment");
                        access_token = Some(value.to_string());
                    },
                    "refresh_token" => {
                        println!("[OAuth] Found refresh_token in fragment");
                        refresh_token = Some(value.to_string());
                    },
                    _ => {}
                }
            }
        }
    }

    match (access_token, refresh_token) {
        (Some(access), Some(refresh)) => {
            println!("[OAuth] Successfully extracted both tokens");
            Ok((access, refresh))
        },
        (access, refresh) => {
            println!("[OAuth] Missing tokens - access: {}, refresh: {}",
                access.is_some(), refresh.is_some());
            Err("Missing access_token or refresh_token in callback".to_string())
        }
    }
}
