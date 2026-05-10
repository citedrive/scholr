export const SEARCH_DATABASE_OPTIONS = [
  {
    id: "semantic-scholar",
    label: "Semantic Scholar",
    hint: "CS and biomedicine; strong abstract-level search.",
  },
  {
    id: "pubmed",
    label: "PubMed",
    hint: "MEDLINE and life-sciences literature.",
  },
  {
    id: "crossref",
    label: "CrossRef",
    hint: "Cross-publisher bibliographic metadata and DOIs.",
  },
  {
    id: "arxiv",
    label: "arXiv",
    hint: "Preprints across physics, math, CS, and q-bio.",
  },
] as const;

export type SearchApiId = (typeof SEARCH_DATABASE_OPTIONS)[number]["id"];
