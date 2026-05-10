//! Live literature retrieval for Semantic Scholar, CrossRef, PubMed, and arXiv.

use serde::{Deserialize, Serialize};
use serde_json::Value;

const FETCH_LIMIT: usize = 25;
const FETCH_LIMIT_U32: u32 = FETCH_LIMIT as u32;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteraturePaper {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub year: i32,
    pub journal: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doi: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteratureSearchDto {
    /// Total corpus hits reported by the index (often an estimate).
    pub total: usize,
    pub returned: usize,
    pub papers: Vec<LiteraturePaper>,
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(format!(
            "ScholrLiteratureBot/1.0 (+https://github.com/citedrive-scholr; mailto:dev@scholr.local)",
        ))
        .build()
        .map_err(|e| format!("HTTP client: {e}"))
}

/// Strip database-style quotes/parentheses — APIs expect plain terms.
pub fn lite_normalize_query(raw: &str) -> String {
    raw.chars()
        .filter(|c| !matches!(c, '"' | '(' | ')'))
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// arXiv `search_query=` fragment (AND/OR of `all:w1+w2`).
fn build_arxiv_search_query(normalized: &str) -> String {
    let n = normalized.trim();
    if n.is_empty() {
        return "all:*".to_string();
    }
    let and_parts = n.split(" AND ").map(str::trim).filter(|x| !x.is_empty());
    let mut blocks = Vec::new();
    for part in and_parts {
        let or_parts = part.split(" OR ").map(str::trim).filter(|x| !x.is_empty());
        let converted: Vec<String> = or_parts
            .map(|p| {
                let condensed: String = p
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join("+");
                format!("all:{condensed}")
            })
            .collect();
        if converted.is_empty() {
            continue;
        }
        if converted.len() == 1 {
            blocks.push(converted.into_iter().next().unwrap());
        } else {
            blocks.push(format!("({})", converted.join("+OR+")));
        }
    }
    if blocks.is_empty() {
        "all:*".to_string()
    } else if blocks.len() == 1 {
        blocks.swap_remove(0)
    } else {
        blocks
            .iter()
            .map(|s| format!("({s})"))
            .collect::<Vec<_>>()
            .join("+AND+")
    }
}

#[tauri::command]
pub async fn search_literature(api_id: String, query: String) -> Result<LiteratureSearchDto, String> {
    match api_id.as_str() {
        "semantic-scholar" => search_semantic_scholar(&query).await,
        "crossref" => search_crossref(&query).await,
        "pubmed" => search_pubmed(&query).await,
        "arxiv" => search_arxiv(&query).await,
        other => Err(format!("Unsupported literature API: {other}")),
    }
}

async fn search_semantic_scholar(query: &str) -> Result<LiteratureSearchDto, String> {
    let client = http_client()?;
    let lite = lite_normalize_query(query);
    if lite.is_empty() {
        return Err("Empty search query.".to_string());
    }

    let resp = client
        .get("https://api.semanticscholar.org/graph/v1/paper/search")
        .query(&[
            ("query", lite.as_str()),
            ("limit", &FETCH_LIMIT.to_string()),
            ("fields", "paperId,title,year,authors,venue,externalIds"),
        ])
        .send()
        .await
        .map_err(|e| format!("Semantic Scholar request failed: {e}"))?;

    if resp.status().as_u16() == 429 {
        return Err(
            "Semantic Scholar rate limited (429). Try again shortly or narrow the query.".to_string(),
        );
    }
    if !resp.status().is_success() {
        return Err(format!("Semantic Scholar error HTTP {}", resp.status()));
    }

    let j: Value = resp
        .json()
        .await
        .map_err(|e| format!("Semantic Scholar JSON decode failed: {e}"))?;

    let total = j["total"].as_u64().unwrap_or(0) as usize;
    let data = j["data"].as_array().cloned().unwrap_or_default();
    let mut papers = Vec::with_capacity(data.len());

    for item in data {
        let id = item["paperId"]
            .as_str()
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        let title = item["title"]
            .as_str()
            .unwrap_or("(Untitled)")
            .to_string();
        let venue = item["venue"].as_str().unwrap_or("");
        let year = item["year"].as_i64().unwrap_or(0) as i32;
        let doi = item["externalIds"]["DOI"].as_str().map(|s| s.to_string());
        let mut authors = Vec::new();
        if let Some(arr) = item["authors"].as_array() {
            for a in arr {
                if let Some(nm) = a["name"].as_str() {
                    authors.push(nm.to_string());
                }
            }
        }
        papers.push(LiteraturePaper {
            id,
            title,
            authors,
            year,
            journal: venue.to_string(),
            doi,
        });
    }

    let returned = papers.len();
    Ok(LiteratureSearchDto {
        total: total.max(returned),
        returned,
        papers,
    })
}

async fn search_crossref(query: &str) -> Result<LiteratureSearchDto, String> {
    let client = http_client()?;
    let lite = lite_normalize_query(query);
    if lite.is_empty() {
        return Err("Empty search query.".to_string());
    }

    let resp = client
        .get("https://api.crossref.org/works")
        .header(
            reqwest::header::USER_AGENT,
            "Scholr/1.0 (mailto:dev@scholr.local; citing CrossRef etiquette)",
        )
        .query(&[
            ("query", lite.as_str()),
            ("rows", &FETCH_LIMIT_U32.to_string()),
            ("sort", "relevance"),
        ])
        .send()
        .await
        .map_err(|e| format!("CrossRef request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("CrossRef error HTTP {}", resp.status()));
    }

    let j: Value = resp
        .json()
        .await
        .map_err(|e| format!("CrossRef JSON decode failed: {e}"))?;

    let msg = &j["message"];

    let total = msg["total-results"]
        .as_u64()
        .or_else(|| msg["total-results"].as_f64().map(|x| x as u64))
        .unwrap_or(0) as usize;

    let items = msg["items"].as_array().cloned().unwrap_or_default();
    let mut papers = Vec::with_capacity(items.len());

    for item in items {
        let doi_val = item["DOI"].as_str().unwrap_or("");
        let id = if !doi_val.is_empty() {
            format!("doi:{doi_val}")
        } else if let Some(u) = item["URL"].as_str() {
            u.to_string()
        } else {
            continue;
        };

        let title = item["title"]
            .as_array()
            .and_then(|a| a.first())
            .and_then(|x| x.as_str())
            .unwrap_or("(Untitled)")
            .to_string();
        let mut authors = Vec::new();
        if let Some(arr) = item["author"].as_array() {
            for a in arr {
                let given = a["given"].as_str().unwrap_or("");
                let fam = a["family"].as_str().unwrap_or("");
                let nm = format!("{}{}{}", given, if given.is_empty() { "" } else { " " }, fam)
                    .trim()
                    .to_string();
                if !nm.is_empty() {
                    authors.push(nm);
                }
            }
        }
        let year = item
            .get("issued")
            .and_then(|x| x.get("date-parts"))
            .and_then(|parts| parts.get(0))
            .and_then(|dates| dates.get(0))
            .and_then(|y| {
                y.as_u64()
                    .map(|n| n as i32)
                    .or_else(|| y.as_str().and_then(|s| s.parse().ok()))
            })
            .unwrap_or(0);
        let journal = item["container-title"]
            .as_array()
            .and_then(|a| a.first())
            .and_then(|x| x.as_str())
            .unwrap_or("");
        let doi_opt = if doi_val.is_empty() {
            None
        } else {
            Some(doi_val.to_string())
        };

        papers.push(LiteraturePaper {
            id,
            title,
            authors,
            year,
            journal: journal.to_string(),
            doi: doi_opt,
        });
    }

    let returned = papers.len();
    Ok(LiteratureSearchDto {
        total: total.max(returned),
        returned,
        papers,
    })
}

async fn search_pubmed(query: &str) -> Result<LiteratureSearchDto, String> {
    let client = http_client()?;
    let lite = lite_normalize_query(query);
    if lite.is_empty() {
        return Err("Empty search query.".to_string());
    }

    let esearch_resp = client
        .get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi")
        .query(&[
            ("db", "pubmed"),
            ("term", lite.as_str()),
            ("retmode", "json"),
            ("retmax", &FETCH_LIMIT_U32.to_string()),
        ])
        .send()
        .await
        .map_err(|e| format!("PubMed esearch failed: {e}"))?;

    if !esearch_resp.status().is_success() {
        return Err(format!(
            "PubMed esearch error HTTP {}",
            esearch_resp.status()
        ));
    }

    let j: Value = esearch_resp
        .json()
        .await
        .map_err(|e| format!("PubMed esearch decode failed: {e}"))?;

    let ids: Vec<String> = j["esearchresult"]["idlist"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    if ids.is_empty() {
        let count_total = j["esearchresult"]["count"]
            .as_str()
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(0);
        return Ok(LiteratureSearchDto {
            total: count_total,
            returned: 0,
            papers: Vec::new(),
        });
    }

    let ids_joined = ids.join(",");
    let esum_resp = client
        .get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi")
        .query(&[
            ("db", "pubmed"),
            ("id", ids_joined.as_str()),
            ("retmode", "json"),
        ])
        .send()
        .await
        .map_err(|e| format!("PubMed esummary failed: {e}"))?;

    let sum_json: Value = esum_resp
        .json()
        .await
        .map_err(|e| format!("PubMed esummary decode failed: {e}"))?;

    let result_root = sum_json["result"].as_object().cloned().unwrap_or_default();
    let mut papers = Vec::new();

    for id in ids {
        let meta = match result_root.get(&id) {
            Some(v) => v.clone(),
            None => continue,
        };
        let title_arr = meta["title"].clone();
        let title_s = title_arr
            .as_str()
            .map(|x| x.to_string())
            .or_else(|| {
                meta["titles"]
                    .as_array()
                    .and_then(|a| a.get(0))
                    .and_then(|x| x.as_str().map(|s| s.to_string()))
            })
            .unwrap_or_else(|| "(Untitled)".to_string());

        let authors = meta["authors"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|a| {
                        a["name"]
                            .as_str()
                            .map(|x| x.to_string())
                            .or_else(|| a["lastname"].as_str().map(|s| s.to_string()))
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let year = meta["pubdate"]
            .as_str()
            .and_then(parse_year_from_pubmed_date)
            .or_else(|| {
                meta["history"]
                    .as_array()
                    .and_then(|h| {
                        h.iter().find(|e| {
                            e["status"].as_str() == Some("pubmed")
                                || e["status"].as_str() == Some("medline")
                        })
                    })
                    .and_then(|e| {
                        let d = e["date"].as_str()?;
                        parse_year_from_pubmed_date(d)
                    })
            })
            .or_else(|| {
                meta["sortpubdate"]
                    .as_str()
                    .and_then(parse_year_from_pubmed_date)
            })
            .or_else(|| meta["year"].as_u64().map(|y| y as i32))
            .or_else(|| meta["year"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);

        let journal = meta["fulljournalname"]
            .as_str()
            .or_else(|| meta["source"].as_str())
            .unwrap_or("")
            .to_string();

        let doi_opt = meta["articleids"].as_array().and_then(|arr| {
            arr.iter()
                .filter_map(|entry| match entry["idtype"].as_str() {
                    Some("doi") => entry["value"].as_str().map(|s| s.to_string()),
                    _ => None,
                })
                .next()
        });

        papers.push(LiteraturePaper {
            id: format!("pubmed:{id}"),
            title: title_s,
            authors,
            year,
            journal,
            doi: doi_opt,
        });
    }

    let total_estimate = j["esearchresult"]["count"]
        .as_str()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(papers.len());

    let returned = papers.len();
    Ok(LiteratureSearchDto {
        total: total_estimate.max(returned),
        returned,
        papers,
    })
}

fn parse_year_from_pubmed_date(s: &str) -> Option<i32> {
    let trimmed = s.trim();
    trimmed
        .get(0..4)
        .and_then(|pfx| pfx.parse::<i32>().ok())
        .filter(|&y| y > 0)
}

async fn search_arxiv(query: &str) -> Result<LiteratureSearchDto, String> {
    let client = http_client()?;
    let n = lite_normalize_query(query);
    let aq = build_arxiv_search_query(&n);
    let lim = FETCH_LIMIT.to_string();

    let xml = client
        .get("http://export.arxiv.org/api/query")
        .query(&[
            ("search_query", aq.as_str()),
            ("start", "0"),
            ("max_results", lim.as_str()),
            ("sortBy", "relevance"),
            ("sortOrder", "descending"),
        ])
        .send()
        .await
        .map_err(|e| format!("arXiv request failed: {e}"))?;

    if !xml.status().is_success() {
        return Err(format!("arXiv error HTTP {}", xml.status()));
    }

    let txt = xml
        .text()
        .await
        .map_err(|e| format!("arXiv response read failed: {e}"))?;

    let doc = roxmltree::Document::parse(&txt)
        .map_err(|e| format!("arXiv XML parse failed: {e}"))?;

    let total_reported = doc
        .descendants()
        .find(|n| n.is_element() && n.tag_name().name() == "totalResults")
        .and_then(|n| n.text())
        .and_then(|t| t.trim().parse::<usize>().ok());

    let mut papers = Vec::new();
    for entry in doc
        .descendants()
        .filter(|n| n.has_tag_name("entry"))
    {
        let id_node = entry
            .children()
            .find(|n| n.is_element() && n.has_tag_name("id"));
        let rid = id_node.and_then(|n| n.text()).unwrap_or("").trim();

        let title_node = entry
            .children()
            .find(|n| n.is_element() && n.has_tag_name("title"));
        let raw_title = title_node.and_then(|n| n.text()).unwrap_or("").trim();

        let title = raw_title
            .chars()
            .filter(|c| !c.is_control())
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");
        let title = if title.is_empty() {
            "(Untitled)".to_string()
        } else {
            title
        };

        let authors: Vec<String> = entry
            .children()
            .filter(|n| n.is_element() && n.has_tag_name("author"))
            .filter_map(|an| an.children().find(|c| c.is_element() && c.has_tag_name("name")))
            .filter_map(|nm| nm.text().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .collect();

        let published = entry
            .children()
            .find(|n| n.is_element() && (n.has_tag_name("published") || n.has_tag_name("updated")))
            .and_then(|n| n.text())
            .and_then(parse_year_from_pubmed_date);

        let year = published.unwrap_or(0);

        let primary_cat = entry
            .children()
            .find(|n| n.is_element() && n.tag_name().name() == "primary_category")
            .and_then(|n| n.attribute("term"))
            .unwrap_or("arXiv");

        let id_stable = rid
            .split('/')
            .last()
            .unwrap_or(rid)
            .to_string();
        let id_stable = format!("arxiv:{id_stable}");

        papers.push(LiteraturePaper {
            id: id_stable,
            title,
            authors,
            year,
            journal: primary_cat.to_string(),
            doi: None,
        });
    }

    let returned = papers.len();

    Ok(LiteratureSearchDto {
        total: total_reported.unwrap_or(returned).max(returned),
        returned,
        papers,
    })
}
