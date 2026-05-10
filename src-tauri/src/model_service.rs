use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "api-keys.json";

// ── Shared data types ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordGroup {
    pub label: String,
    pub terms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombineStepData {
    pub groups: Vec<KeywordGroup>,
    #[serde(rename = "searchString")]
    pub search_string: String,
    #[serde(rename = "preciseSearchString")]
    pub precise_search_string: String,
}

#[derive(Debug, Deserialize)]
struct CombineStepPartial {
    groups: Vec<KeywordGroup>,
    #[serde(rename = "searchString")]
    search_string: String,
    #[serde(rename = "preciseSearchString")]
    precise_search_string: Option<String>,
}

// ── Key management ────────────────────────────────────────────────────────────

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

// ── Public commands ───────────────────────────────────────────────────────────

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
    let content = call_provider_raw(&app, &provider, &model, &system_prompt, &query).await?;
    parse_keywords(&content)
}

/// Group the extracted keywords into concept clusters and build a boolean
/// search string. Returns a CombineStepData struct serialised as JSON.
#[tauri::command]
pub async fn combine_keywords(
    app: AppHandle,
    query: String,
    keywords: Vec<String>,
    provider: String,
    model: String,
    system_prompt: String,
) -> Result<CombineStepData, String> {
    let keyword_list = keywords
        .iter()
        .map(|k| format!("- {k}"))
        .collect::<Vec<_>>()
        .join("\n");
    let user_message = format!(
        "Research question: {query}\n\nExtracted keywords:\n{keyword_list}"
    );

    let content = call_provider_raw(&app, &provider, &model, &system_prompt, &user_message).await?;
    parse_combine(&content)
}

// ── HTTP provider dispatch ────────────────────────────────────────────────────

async fn call_provider_raw(
    app: &AppHandle,
    provider: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<String, String> {
    match provider {
        "chatgpt" => {
            let api_key = get_stored_key(app, "chatgpt")?;
            let client = build_client()?;
            let body = json!({
                "model": model,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_message }
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

            json["choices"][0]["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Missing content in OpenAI response".to_string())
        }

        "claude" => {
            let api_key = get_stored_key(app, "claude")?;
            let client = build_client()?;
            let body = json!({
                "model": model,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [
                    { "role": "user", "content": user_message }
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

            json["content"][0]["text"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Missing content in Anthropic response".to_string())
        }

        "ollama" => {
            let client = build_client()?;
            let body = json!({
                "model": model,
                "stream": false,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_message }
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

            json["message"]["content"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Missing content in Ollama response".to_string())
        }

        other => Err(format!("Unknown provider: {other}")),
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/// Strip optional markdown code fences from model output and return the inner text.
fn strip_fences(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.starts_with("```") {
        trimmed
            .lines()
            .skip(1)
            .collect::<Vec<_>>()
            .join("\n")
            .trim_end_matches("```")
            .trim()
            .to_string()
    } else {
        trimmed.to_string()
    }
}

/// Parse a JSON array of strings from model output.
fn parse_keywords(content: &str) -> Result<Vec<String>, String> {
    let inner = strip_fences(content);

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

fn narrow_fallback_from_groups(groups: &[KeywordGroup]) -> String {
    groups
        .iter()
        .filter_map(|g| g.terms.first())
        .map(|t| format!("\"{t}\""))
        .collect::<Vec<_>>()
        .join(" AND ")
}

fn finalize_combine(partial: CombineStepPartial) -> CombineStepData {
    let precise = partial.precise_search_string.unwrap_or_else(|| {
        narrow_fallback_from_groups(&partial.groups)
    });
    CombineStepData {
        groups: partial.groups,
        search_string: partial.search_string,
        precise_search_string: precise,
    }
}

/// Parse a CombineStepData JSON object from model output.
fn parse_combine(content: &str) -> Result<CombineStepData, String> {
    let inner = strip_fences(content);

    if let Ok(partial) = serde_json::from_str::<CombineStepPartial>(&inner) {
        return Ok(finalize_combine(partial));
    }

    // Fall back: find the first '{' ... '}' substring
    if let (Some(start), Some(end)) = (inner.find('{'), inner.rfind('}')) {
        let slice = &inner[start..=end];
        if let Ok(partial) = serde_json::from_str::<CombineStepPartial>(slice) {
            return Ok(finalize_combine(partial));
        }
    }

    Err(format!(
        "Could not parse combine result from model output: {inner}"
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
