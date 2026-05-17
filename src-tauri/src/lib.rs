mod literature_search;
mod model_service;
mod vault_service;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            model_service::set_api_key,
            model_service::has_api_key,
            model_service::extract_keywords,
            model_service::combine_keywords,
            literature_search::search_literature,
            vault_service::get_vault_path,
            vault_service::set_vault_path,
            vault_service::pick_vault_folder,
            vault_service::list_sessions,
            vault_service::save_session,
            vault_service::load_session,
            vault_service::delete_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
