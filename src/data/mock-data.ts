import type { ResearchSession, PipelineStep } from "@/types/research";

const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

function makePipeline(overrides?: {
  keywordTerms?: string[];
  paperTotal?: number;
  filterRemoved?: number;
}): PipelineStep[] {
  const terms = overrides?.keywordTerms ?? [
    "lorem ipsum",
    "dolor sit amet",
    "consectetur adipiscing",
    "sed do eiusmod",
  ];
  const total = overrides?.paperTotal ?? 2_893;
  const removed = overrides?.filterRemoved ?? 412;

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
      id: "search",
      label: "Database search",
      status: "done",
      data: {
        total,
        sources: [
          { name: "Semantic Scholar", count: Math.round(total * 0.43) },
          { name: "PubMed", count: Math.round(total * 0.30) },
          { name: "arXiv", count: Math.round(total * 0.19) },
          { name: "CrossRef", count: Math.round(total * 0.08) },
        ],
      },
    },
    {
      id: "collect",
      label: "Paper collection",
      status: "done",
      data: {
        total,
        withMetadata: total - Math.round(total * 0.06),
      },
    },
    {
      id: "filter",
      label: "Abstract filter",
      status: "done",
      data: {
        before: total - Math.round(total * 0.06),
        removed,
        after: total - Math.round(total * 0.06) - removed,
      },
    },
    {
      id: "evaluate",
      label: "Relevance scoring",
      status: "done",
      data: {
        papers: [
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
        ],
      },
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
      filterRemoved: 412,
    }),
  },
  {
    id: "sess-2",
    query: "Sed ut perspiciatis unde omnis iste natus error?",
    createdAt: d(1),
    steps: makePipeline({
      keywordTerms: ["perspiciatis", "omnis iste natus", "voluptatem", "architecto beatae"],
      paperTotal: 1_740,
      filterRemoved: 284,
    }),
  },
  {
    id: "sess-3",
    query: "Quis autem vel eum iure reprehenderit voluptate?",
    createdAt: d(2),
    steps: makePipeline({
      keywordTerms: ["iure reprehenderit", "voluptate velit", "quam nihil", "molestiae consequatur"],
      paperTotal: 3_210,
      filterRemoved: 531,
    }),
  },
  {
    id: "sess-4",
    query: "Temporibus autem quibusdam et aut officiis?",
    createdAt: d(3),
    steps: makePipeline({
      keywordTerms: ["temporibus autem", "officiis debitis", "rerum necessitatibus", "saepe eveniet"],
      paperTotal: 2_105,
      filterRemoved: 347,
    }),
  },
  {
    id: "sess-5",
    query: "Nam libero tempore cum soluta nobis?",
    createdAt: d(5),
    steps: makePipeline({
      keywordTerms: ["libero tempore", "soluta nobis", "eligendi optio", "cumque nihil"],
      paperTotal: 988,
      filterRemoved: 163,
    }),
  },
];

export function createEmptySession(id: string, query: string): ResearchSession {
  const STEP_LABELS: PipelineStep[] = [
    { id: "keywords", label: "Keyword analysis",   status: "pending" },
    { id: "search",   label: "Database search",     status: "pending" },
    { id: "collect",  label: "Paper collection",     status: "pending" },
    { id: "filter",   label: "Abstract filter",    status: "pending" },
    { id: "evaluate", label: "Relevance scoring", status: "pending" },
  ];
  return { id, query, createdAt: new Date(), steps: STEP_LABELS };
}

export function generateStepData(query: string): PipelineStep["data"][] {
  const words = query.trim().split(/\s+/);
  const full = makePipeline({
    keywordTerms: [
      words.slice(0, 2).join(" "),
      words.slice(1, 3).join(" ") || "lorem ipsum",
      words.slice(2, 4).join(" ") || "dolor amet",
      "ut labore dolore",
    ],
  });
  return full.map((s) => s.data);
}
