use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "api-keys.json";

fn store_key_name(provider: &str) -> String {
    format!("{}_api_key", provider)
}

/// Persist an API key for the given provider in the Tauri store.
#[tauri::command]
pub async fn set_api_key(app: AppHandle, provider: String, key: String) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {e}"))?;
    store.set(store_key_name(&provider), json!(key));
    store.save().map_err(|e| format!("Failed to save store: {e}"))?;
    Ok(())
}

/// Return whether an API key is saved for the given provider.
#[tauri::command]
pub async fn has_api_key(app: AppHandle, provider: String) -> Result<bool, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {e}"))?;
    Ok(store.has(store_key_name(&provider)))
}

/// Extract keywords from the research query using the selected model provider.
/// Returns a list of keyword strings, or an error string if the call fails.
#[tauri::command]
pub async fn extract_keywords(
    app: AppHandle,
    query: String,
    provider: String,
    model: String,
    system_prompt: String,
) -> Result<Vec<String>, String> {
    match provider.as_str() {
        "chatgpt" => call_openai(app, query, model, system_prompt).await,
        "claude" => call_anthropic(app, query, model, system_prompt).await,
        "ollama" => call_ollama(query, model, system_prompt).await,
        other => Err(format!("Unknown provider: {other}")),
    }
}

async fn call_openai(
    app: AppHandle,
    query: String,
    model: String,
    system_prompt: String,
) -> Result<Vec<String>, String> {
    let api_key = get_stored_key(&app, "chatgpt")?;

    let client = build_client()?;
    let body = json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": query }
        ],
        "temperature": 0.2
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenAI request failed: {e}"))?;

    let status = resp.status();
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {e}"))?;

    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Unknown error")
            .to_string();
        return Err(format!("OpenAI error {status}: {msg}"));
    }

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Missing content in OpenAI response")?;

    parse_keywords(content)
}

async fn call_anthropic(
    app: AppHandle,
    query: String,
    model: String,
    system_prompt: String,
) -> Result<Vec<String>, String> {
    let api_key = get_stored_key(&app, "claude")?;

    let client = build_client()?;
    let body = json!({
        "model": model,
        "max_tokens": 512,
        "system": system_prompt,
        "messages": [
            { "role": "user", "content": query }
        ]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic request failed: {e}"))?;

    let status = resp.status();
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Anthropic response: {e}"))?;

    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Unknown error")
            .to_string();
        return Err(format!("Anthropic error {status}: {msg}"));
    }

    let content = json["content"][0]["text"]
        .as_str()
        .ok_or("Missing content in Anthropic response")?;

    parse_keywords(content)
}

async fn call_ollama(
    query: String,
    model: String,
    system_prompt: String,
) -> Result<Vec<String>, String> {
    let client = build_client()?;
    let body = json!({
        "model": model,
        "stream": false,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": query }
        ]
    });

    let resp = client
        .post("http://localhost:11434/api/chat")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama request failed (is Ollama running?): {e}"))?;

    let status = resp.status();
    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {e}"))?;

    if !status.is_success() {
        let msg = json["error"].as_str().unwrap_or("Unknown error").to_string();
        return Err(format!("Ollama error {status}: {msg}"));
    }

    let content = json["message"]["content"]
        .as_str()
        .ok_or("Missing content in Ollama response")?;

    parse_keywords(content)
}

fn get_stored_key(app: &AppHandle, provider: &str) -> Result<String, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {e}"))?;
    let val = store
        .get(store_key_name(provider))
        .ok_or_else(|| format!("No API key found for provider '{provider}'"))?;
    val.as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Stored API key for '{provider}' is not a string"))
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))
}

/// Parse a JSON array of strings from model output.
/// Strips markdown code fences if present, then falls back to extracting
/// a JSON array substring if the model wraps it in prose.
fn parse_keywords(content: &str) -> Result<Vec<String>, String> {
    let trimmed = content.trim();

    // Strip optional markdown code fences (```json ... ``` or ``` ... ```)
    let inner = if trimmed.starts_with("```") {
        trimmed
            .lines()
            .skip(1) // drop opening fence line
            .collect::<Vec<_>>()
            .join("\n")
            .trim_end_matches("```")
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    };

    // Try parsing as a bare JSON array first
    if let Ok(val) = serde_json::from_str::<Value>(&inner) {
        return extract_string_array(&val);
    }

    // Fall back: find the first '[' ... ']' substring
    if let (Some(start), Some(end)) = (inner.find('['), inner.rfind(']')) {
        let slice = &inner[start..=end];
        if let Ok(val) = serde_json::from_str::<Value>(slice) {
            return extract_string_array(&val);
        }
    }

    Err(format!(
        "Could not parse keyword array from model output: {inner}"
    ))
}

fn extract_string_array(val: &Value) -> Result<Vec<String>, String> {
    val.as_array()
        .ok_or_else(|| "Expected a JSON array".to_string())?
        .iter()
        .map(|v| {
            v.as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| format!("Non-string element in keyword array: {v}"))
        })
        .collect()
}
