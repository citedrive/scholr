import type {
  ResearchSession,
  PipelineStep,
  CollectStepData,
  FilterStepData,
  EvaluateStepData,
  SearchStepData,
} from "@/types/research";

const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

/** Mirrors historical demo abstract-filter ratio (~14%). */
export const MOCK_ABSTRACT_FILTER_SHARE = 412 / 2_893;

const MOCK_EVALUATION_PAPERS: EvaluateStepData["papers"] = [
  {
    id: "p1",
    title: "Lorem ipsum dolor sit amet consectetur adipiscing elit",
    authors: ["A. Lorem", "B. Ipsum"],
    year: 2024,
    journal: "Nature Lorem",
    relevanceScore: 94,
  },
  {
    id: "p2",
    title: "Sed ut perspiciatis unde omnis iste natus error",
    authors: ["C. Dolor", "D. Amet"],
    year: 2024,
    journal: "Journal of Ipsum",
    relevanceScore: 88,
  },
  {
    id: "p3",
    title: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur",
    authors: ["E. Consectetur"],
    year: 2023,
    journal: "Adipiscing Review",
    relevanceScore: 82,
  },
  {
    id: "p4",
    title: "At vero eos et accusamus et iusto odio dignissimos",
    authors: ["F. Elit", "G. Sed"],
    year: 2023,
    journal: "Dolor Quarterly",
    relevanceScore: 76,
  },
  {
    id: "p5",
    title: "Nam libero tempore cum soluta nobis eligendi optio",
    authors: ["H. Eiusmod"],
    year: 2022,
    journal: "Lorem Proceedings",
    relevanceScore: 71,
  },
  {
    id: "p6",
    title: "Temporibus autem quibusdam et aut officiis debitis",
    authors: ["I. Tempor", "J. Incididunt"],
    year: 2022,
    journal: "Amet Letters",
    relevanceScore: 63,
  },
  {
    id: "p7",
    title: "Itaque earum rerum hic tenetur a sapiente delectus",
    authors: ["K. Labore"],
    year: 2021,
    journal: "Tempor Journal",
    relevanceScore: 55,
  },
  {
    id: "p8",
    title: "Quis autem vel eum iure reprehenderit voluptate",
    authors: ["L. Dolore"],
    year: 2020,
    journal: "Magna Review",
    relevanceScore: 47,
  },
];

/**
 * Simulated collect/filter/evaluate from a live corpus total and fetched,
 * relevance-scored records.
 */
export function generateTailStepData(
  reportedCorpusTotal: number,
  scoredPapers: EvaluateStepData["papers"],
): {
  collect: CollectStepData;
  filter: FilterStepData;
  evaluate: EvaluateStepData;
} {
  const fetched = scoredPapers.length;

  if (fetched === 0) {
    return {
      collect: {
        total: reportedCorpusTotal,
        withMetadata: 0,
      },
      filter: { before: 0, removed: 0, after: 0 },
      evaluate: { papers: [] },
    };
  }

  const metaGap = Math.max(0, Math.round(fetched * 0.06));
  const withMetadata = Math.max(1, fetched - metaGap);
  const before = withMetadata;
  const removed = Math.min(
    Math.round(before * MOCK_ABSTRACT_FILTER_SHARE),
    Math.max(0, before - 1),
  );
  const after = Math.max(0, before - removed);
  const kept = scoredPapers.slice(0, after);

  return {
    collect: {
      total: fetched,
      withMetadata,
    },
    filter: { before, removed, after },
    evaluate: { papers: kept },
  };
}

function makePipeline(overrides?: {
  keywordTerms?: string[];
  paperTotal?: number;
}): PipelineStep[] {
  const terms = overrides?.keywordTerms ?? [
    "lorem ipsum",
    "dolor sit amet",
    "consectetur adipiscing",
    "sed do eiusmod",
  ];
  const total = overrides?.paperTotal ?? 2_893;

  // Build two concept groups from the four keyword terms for the mock combine step
  const group1Terms = [terms[0], terms[1]].filter(Boolean);
  const group2Terms = [terms[2], terms[3]].filter(Boolean);
  const searchString =
    `(${group1Terms.map((t) => `"${t}"`).join(" OR ")})` +
    ` AND (${group2Terms.map((t) => `"${t}"`).join(" OR ")})`;
  const preciseSearchString = [group1Terms[0], group2Terms[0]]
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(" AND ");

  const tail = generateTailStepData(total, MOCK_EVALUATION_PAPERS);

  return [
    {
      id: "keywords",
      label: "Keyword analysis",
      status: "done",
      data: {
        keywords: [
          { term: terms[0], count: Math.round(total * 0.43) },
          { term: terms[1], count: Math.round(total * 0.30) },
          { term: terms[2], count: Math.round(total * 0.19) },
          { term: terms[3] ?? "ut labore", count: Math.round(total * 0.08) },
        ],
      },
    },
    {
      id: "combine",
      label: "Query construction",
      status: "done",
      data: {
        groups: [
          { label: "Concept A", terms: group1Terms },
          { label: "Concept B", terms: group2Terms },
        ],
        searchString,
        preciseSearchString,
      },
    },
    {
      id: "search",
      label: "Database search",
      status: "done",
      data: {
        total,
        hitsReturned: MOCK_EVALUATION_PAPERS.length,
        sources: [{ name: "Semantic Scholar", count: total }],
        chosenApi: "semantic-scholar",
        queryVariant: "broad",
        queryUsed: searchString,
        papers: MOCK_EVALUATION_PAPERS,
      } satisfies SearchStepData,
    },
    {
      id: "collect",
      label: "Paper collection",
      status: "done",
      data: tail.collect,
    },
    {
      id: "filter",
      label: "Abstract filter",
      status: "done",
      data: tail.filter,
    },
    {
      id: "evaluate",
      label: "Relevance scoring",
      status: "done",
      data: tail.evaluate,
    },
  ];
}

export const MOCK_SESSIONS: ResearchSession[] = [
  {
    id: "sess-1",
    query: "Lorem ipsum dolor sit amet consectetur adipiscing?",
    createdAt: d(0),
    steps: makePipeline({
      keywordTerms: ["lorem ipsum", "dolor sit amet", "consectetur adipiscing", "sed do eiusmod"],
      paperTotal: 2_893,
    }),
  },
  {
    id: "sess-2",
    query: "Sed ut perspiciatis unde omnis iste natus error?",
    createdAt: d(1),
    steps: makePipeline({
      keywordTerms: ["perspiciatis", "omnis iste natus", "voluptatem", "architecto beatae"],
      paperTotal: 1_740,
    }),
  },
  {
    id: "sess-3",
    query: "Quis autem vel eum iure reprehenderit voluptate?",
    createdAt: d(2),
    steps: makePipeline({
      keywordTerms: ["iure reprehenderit", "voluptate velit", "quam nihil", "molestiae consequatur"],
      paperTotal: 3_210,
    }),
  },
  {
    id: "sess-4",
    query: "Temporibus autem quibusdam et aut officiis?",
    createdAt: d(3),
    steps: makePipeline({
      keywordTerms: ["temporibus autem", "officiis debitis", "rerum necessitatibus", "saepe eveniet"],
      paperTotal: 2_105,
    }),
  },
  {
    id: "sess-5",
    query: "Nam libero tempore cum soluta nobis?",
    createdAt: d(5),
    steps: makePipeline({
      keywordTerms: ["libero tempore", "soluta nobis", "eligendi optio", "cumque nihil"],
      paperTotal: 988,
    }),
  },
];

export function createEmptySession(id: string, query: string): ResearchSession {
  const STEP_LABELS: PipelineStep[] = [
    { id: "keywords", label: "Keyword analysis",   status: "pending" },
    { id: "combine",  label: "Query construction",  status: "pending" },
    { id: "search",   label: "Database search",     status: "pending" },
    { id: "collect",  label: "Paper collection",    status: "pending" },
    { id: "filter",   label: "Abstract filter",     status: "pending" },
    { id: "evaluate", label: "Relevance scoring",   status: "pending" },
  ];
  return { id, query, createdAt: new Date(), steps: STEP_LABELS };
}
