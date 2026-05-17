use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_store::StoreExt;

const CONFIG_STORE: &str = "app-config.json";
const VAULT_PATH_KEY: &str = "vault_path";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionListItem {
    pub id: String,
    pub query: String,
    pub created_at: String,
    pub updated_at: String,
}

fn read_vault_path_from_store(app: &AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(CONFIG_STORE)
        .map_err(|e| format!("Failed to open config store: {e}"))?;
    Ok(store
        .get(VAULT_PATH_KEY)
        .and_then(|v| v.as_str().map(String::from)))
}

fn validate_vault_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("Folder does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a folder: {}", path.display()));
    }
    let test_file = path.join(".scholr_write_test");
    fs::write(&test_file, b"ok").map_err(|e| {
        format!(
            "Folder is not writable ({}): {e}",
            path.display()
        )
    })?;
    let _ = fs::remove_file(test_file);
    Ok(())
}

fn vault_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path_str = read_vault_path_from_store(app)?
        .ok_or_else(|| "No vault folder configured".to_string())?;
    let path = PathBuf::from(path_str);
    validate_vault_dir(&path)?;
    Ok(path)
}

fn session_file_path(vault: &Path, session_id: &str) -> Result<PathBuf, String> {
    if session_id.is_empty()
        || session_id.contains('/')
        || session_id.contains('\\')
        || session_id.contains("..")
    {
        return Err("Invalid session id".to_string());
    }
    Ok(vault.join(format!("{session_id}.json")))
}

fn parse_session_meta(contents: &str, fallback_id: &str) -> Option<SessionListItem> {
    let value: Value = serde_json::from_str(contents).ok()?;
    let id = value
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or(fallback_id)
        .to_string();
    let query = value
        .get("query")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let created_at = value
        .get("createdAt")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let updated_at = value
        .get("updatedAt")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(String::from)
        .unwrap_or_else(|| created_at.clone());
    Some(SessionListItem {
        id,
        query,
        created_at,
        updated_at,
    })
}

/// Returns the configured vault folder path, if any.
#[tauri::command]
pub async fn get_vault_path(app: AppHandle) -> Result<Option<String>, String> {
    read_vault_path_from_store(&app)
}

/// Validates and persists the vault folder path.
#[tauri::command]
pub async fn set_vault_path(app: AppHandle, path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(path.trim());
    validate_vault_dir(&path_buf)?;
    let store = app
        .store(CONFIG_STORE)
        .map_err(|e| format!("Failed to open config store: {e}"))?;
    let canonical = path_buf
        .canonicalize()
        .unwrap_or(path_buf)
        .to_string_lossy()
        .to_string();
    store.set(VAULT_PATH_KEY, Value::String(canonical));
    store
        .save()
        .map_err(|e| format!("Failed to save config: {e}"))?;
    Ok(())
}

/// Opens a native folder picker and saves the selection as the vault path.
#[tauri::command]
pub async fn pick_vault_folder(app: AppHandle) -> Result<String, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Choose vault folder for searches")
        .blocking_pick_folder();

    let Some(folder) = picked else {
        return Err("No folder selected".to_string());
    };

    let path = folder
        .into_path()
        .map_err(|e| format!("Invalid folder path: {e}"))?
        .to_string_lossy()
        .to_string();

    set_vault_path(app, path.clone()).await?;
    Ok(path)
}

/// Lists all session JSON files in the vault (newest first by createdAt).
#[tauri::command]
pub async fn list_sessions(app: AppHandle) -> Result<Vec<SessionListItem>, String> {
    let vault = vault_dir(&app)?;
    let mut items: Vec<SessionListItem> = Vec::new();

    let entries = fs::read_dir(&vault).map_err(|e| {
        format!("Failed to read vault folder ({}): {e}", vault.display())
    })?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        if file_name.ends_with(".tmp") {
            continue;
        }
        let contents = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[vault] skip {}: {e}", path.display());
                continue;
            }
        };
        match parse_session_meta(&contents, &file_name) {
            Some(meta) => items.push(meta),
            None => eprintln!("[vault] skip invalid JSON: {}", path.display()),
        }
    }

    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items)
}

/// Atomically writes a session JSON file into the vault.
#[tauri::command]
pub async fn save_session(
    app: AppHandle,
    session_id: String,
    session_json: String,
) -> Result<(), String> {
    let vault = vault_dir(&app)?;
    let dest = session_file_path(&vault, &session_id)?;
    let tmp = dest.with_extension("json.tmp");

    fs::write(&tmp, session_json.as_bytes()).map_err(|e| {
        format!("Failed to write session ({}): {e}", tmp.display())
    })?;
    fs::rename(&tmp, &dest).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Failed to save session ({}): {e}", dest.display())
    })?;
    Ok(())
}

/// Loads a session JSON file from the vault.
#[tauri::command]
pub async fn load_session(app: AppHandle, session_id: String) -> Result<String, String> {
    let vault = vault_dir(&app)?;
    let path = session_file_path(&vault, &session_id)?;
    fs::read_to_string(&path).map_err(|e| {
        format!("Failed to load session ({}): {e}", path.display())
    })
}

/// Deletes a session JSON file from the vault.
#[tauri::command]
pub async fn delete_session(app: AppHandle, session_id: String) -> Result<(), String> {
    let vault = vault_dir(&app)?;
    let path = session_file_path(&vault, &session_id)?;
    if !path.exists() {
        return Err(format!("Session not found: {session_id}"));
    }
    fs::remove_file(&path).map_err(|e| {
        format!("Failed to delete session ({}): {e}", path.display())
    })?;
    let tmp = path.with_extension("json.tmp");
    if tmp.exists() {
        let _ = fs::remove_file(tmp);
    }
    Ok(())
}
