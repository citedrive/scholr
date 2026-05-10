mod literature_search;
mod model_service;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            model_service::set_api_key,
            model_service::has_api_key,
            model_service::extract_keywords,
            model_service::combine_keywords,
            literature_search::search_literature,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
