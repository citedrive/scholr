import type { ResearchSession } from "@/types/research";
import type { ResearchSessionJson } from "@/types/vault";

export function toSessionJson(session: ResearchSession): ResearchSessionJson {
  const now = new Date().toISOString();
  return {
    id: session.id,
    query: session.query,
    steps: session.steps,
    createdAt:
      session.createdAt instanceof Date
        ? session.createdAt.toISOString()
        : new Date(session.createdAt).toISOString(),
    updatedAt: now,
  };
}

export function fromSessionJson(json: ResearchSessionJson): ResearchSession {
  return {
    id: json.id,
    query: json.query,
    steps: json.steps,
    createdAt: new Date(json.createdAt),
  };
}

export function serializeSession(session: ResearchSession): string {
  return JSON.stringify(toSessionJson(session), null, 2);
}

export function parseSessionJson(raw: string): ResearchSession {
  const parsed = JSON.parse(raw) as ResearchSessionJson;
  return fromSessionJson(parsed);
}
