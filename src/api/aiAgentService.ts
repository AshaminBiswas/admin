import { API_BASE_URL, getAdminToken } from "./adminApi";

const BASE = `${API_BASE_URL}/ai-agent`;

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatContext {
  view?: string;
  entityId?: string;
  entityType?: string;
}

export interface AiChatResponse {
  reply: string;
  model: string;
}

export interface AiDraftReplyResponse {
  subject: string;
  body: string;
  suggestedStatus: string;
  detectedContext: string;
  model: string;
}

export interface AiReportResponse {
  report: string;
  reportType: string;
  generatedAt: string;
  model: string;
}

export type ReportType =
  | "executive_summary"
  | "po_analysis"
  | "quotation_pipeline"
  | "inventory_health"
  | "payment_reconciliation"
  | "dispatch_sla"
  | "low_stock_alerts"
  | "customer_activity"
  | "revenue_trends";

// ─── API Functions ────────────────────────────────────────────────────────────

export async function copilotChat(
  messages: AiChatMessage[],
  context?: AiChatContext
): Promise<AiChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages, context, stream: false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI chat failed (${res.status})`);
  }
  const data = await res.json();
  return data.data as AiChatResponse;
}

export async function draftPoReply(
  poId: string,
  options: {
    tone?: "professional" | "friendly" | "urgent" | "apologetic";
    instructions?: string;
    includeStockCheck?: boolean;
  } = {}
): Promise<AiDraftReplyResponse> {
  const res = await fetch(`${BASE}/draft-reply`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      poId,
      tone: options.tone ?? "professional",
      instructions: options.instructions,
      includeStockCheck: options.includeStockCheck ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI draft failed (${res.status})`);
  }
  const data = await res.json();
  return data.data as AiDraftReplyResponse;
}

export async function generateAiReport(
  reportType: ReportType,
  options: {
    dateRange?: { from?: string; to?: string };
    format?: "text" | "json" | "markdown";
  } = {}
): Promise<AiReportResponse> {
  const res = await fetch(`${BASE}/report`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      reportType,
      dateRange: options.dateRange,
      format: options.format ?? "markdown",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `AI report failed (${res.status})`);
  }
  const data = await res.json();
  return data.data as AiReportResponse;
}
