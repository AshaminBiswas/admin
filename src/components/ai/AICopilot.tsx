import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  BarChart3,
  Mail,
  ChevronDown,
  Copy,
  Check,
  RefreshCw,
  Inbox,
} from "lucide-react";
import {
  copilotChat,
  draftPoReply,
  generateAiReport,
  AiChatMessage,
  ReportType,
} from "../../api/aiAgentService";
import { useAdminAuth } from "../../context/AdminAuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface AICopilotProps {
  currentPoId?: string | null;
  currentView?: string;
}

const QUICK_PROMPTS = [
  { icon: <BarChart3 size={13} />, label: "Executive Summary", prompt: "Generate an executive summary of business performance this month" },
  { icon: <Inbox size={13} />, label: "PO Analysis", prompt: "Analyze recent purchase orders and give me key insights" },
  { icon: <FileText size={13} />, label: "Low Stock Alert", prompt: "Which products are running low on stock and need immediate reordering?" },
  { icon: <Mail size={13} />, label: "Payment Issues", prompt: "Are there any failed or pending payments that need follow-up?" },
];

const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: "executive_summary", label: "📊 Executive Summary" },
  { id: "po_analysis", label: "📦 PO Analysis" },
  { id: "inventory_health", label: "🏭 Inventory Health" },
  { id: "quotation_pipeline", label: "📋 Quotation Pipeline" },
  { id: "payment_reconciliation", label: "💳 Payment Reconciliation" },
  { id: "low_stock_alerts", label: "⚠️ Low Stock Alerts" },
  { id: "revenue_trends", label: "📈 Revenue Trends" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AICopilot({ currentPoId, currentView }: AICopilotProps) {
  const { adminUser } = useAdminAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello${adminUser?.firstName ? ` ${adminUser.firstName}` : ""}! 👋 I am your **PRC Hardware AI Copilot**, powered by NVIDIA llama-3.2-90b-vision. I can help you:\n\n• **Draft professional email replies** for customer POs\n• **Analyze business data** and generate executive reports\n• **Detect low stock**, payment issues, and dispatch delays\n• **Answer questions** about orders, quotations, and inventory\n\nWhat would you like help with today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isDraftingReply, setIsDraftingReply] = useState(false);
  const [draftTone, setDraftTone] = useState<"professional" | "friendly" | "urgent" | "apologetic">("professional");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);
  const chatHistory = useRef<AiChatMessage[]>([]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close report menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) {
        setShowReportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    const newMsg: Message = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages((prev) => prev.filter((m) => !m.isLoading).concat(newMsg));
    return newMsg.id;
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputValue("");

    // Add user message
    addMessage({ role: "user", content: text });

    // Add loading placeholder
    const loadingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date(), isLoading: true },
    ]);
    setIsLoading(true);

    // Update chat history
    chatHistory.current = [
      ...chatHistory.current,
      { role: "user" as const, content: text },
    ].slice(-10); // Keep last 10 messages for context

    try {
      const response = await copilotChat(chatHistory.current, {
        view: currentView,
        entityId: currentPoId ?? undefined,
        entityType: currentPoId ? "po" : undefined,
      });

      chatHistory.current.push({ role: "assistant" as const, content: response.reply });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: response.reply, isLoading: false }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `⚠️ **Error**: ${err.message || "Failed to get AI response. Please check your NVIDIA API key in environment variables."}`,
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftReply = async () => {
    if (!currentPoId) {
      addMessage({
        role: "assistant",
        content: "⚠️ Please open a specific PO detail page first, then click **Draft Reply** to generate a contextual email reply for that customer.",
      });
      return;
    }

    setIsDraftingReply(true);
    const loadingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      const draft = await draftPoReply(currentPoId, {
        tone: draftTone,
        includeStockCheck: true,
      });

      const content = `✅ **AI Email Draft Generated**

**Detected Context:** ${draft.detectedContext}
**Suggested Status:** \`${draft.suggestedStatus}\`

---

**📧 Subject:** ${draft.subject}

**📝 Body:**

${draft.body}

---
*Generated by ${draft.model}. Review before sending.*`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { ...m, content, isLoading: false } : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `⚠️ **Draft failed**: ${err.message}`,
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsDraftingReply(false);
    }
  };

  const handleGenerateReport = async (reportType: ReportType) => {
    setShowReportMenu(false);
    const loadingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      },
    ]);
    setIsLoading(true);

    try {
      const report = await generateAiReport(reportType, { format: "markdown" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `📊 **${reportType.replace(/_/g, " ").toUpperCase()} REPORT**\n\n${report.report}`, isLoading: false }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `⚠️ **Report failed**: ${err.message}`, isLoading: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearChat = () => {
    chatHistory.current = [];
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared! How can I help you?",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // ── Render Markdown-like formatting ──────────────────────────────────────────
  const renderContent = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold
      const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Inline code
      const withCode = formatted.replace(/`([^`]+)`/g, '<code class="bg-[#27272A] text-violet-300 px-1 rounded text-xs">$1</code>');
      // HR
      if (line === "---") return <hr key={i} className="my-2 border-[#27272A]" />;
      // Heading
      if (line.startsWith("# ")) return <p key={i} className="font-bold text-base mt-2" dangerouslySetInnerHTML={{ __html: withCode.slice(2) }} />;
      if (line.startsWith("## ")) return <p key={i} className="font-semibold mt-2" dangerouslySetInnerHTML={{ __html: withCode.slice(3) }} />;
      if (line.startsWith("### ")) return <p key={i} className="font-medium mt-1" dangerouslySetInnerHTML={{ __html: withCode.slice(4) }} />;
      // List items
      if (line.startsWith("• ") || line.startsWith("- ")) return (
        <p key={i} className="flex gap-1.5" dangerouslySetInnerHTML={{ __html: "• " + withCode.slice(2) }} />
      );
      return <p key={i} dangerouslySetInnerHTML={{ __html: withCode || "&nbsp;" }} />;
    });
  };

  return (
    <>
      {/* ── Floating Button ───────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 bg-gradient-to-br from-violet-600 to-violet-800 hover:from-violet-500 hover:to-violet-700 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-violet-900/40 transition-all duration-200 active:scale-95 group"
          title="Open AI Copilot"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-semibold hidden sm:inline">AI Copilot</span>
        </button>
      )}

      {/* ── Sidebar Panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end pointer-events-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative pointer-events-auto w-full max-w-md flex flex-col bg-[#09090B] border-l border-[#27272A] shadow-2xl h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272A] bg-gradient-to-r from-violet-950/60 to-[#09090B] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-lg shadow-violet-900/40">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">PRC AI Copilot</p>
                  <p className="text-[10px] text-violet-400">llama-3.2-90b-vision · NVIDIA NIM</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Clear chat"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Context Banner */}
            {currentPoId && (
              <div className="px-3 py-2 bg-violet-950/30 border-b border-violet-900/30 shrink-0">
                <p className="text-[11px] text-violet-300">
                  📌 PO context active — <span className="font-semibold">AI can draft replies for this PO</span>
                </p>
              </div>
            )}

            {/* Quick Action Bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#27272A] overflow-x-auto no-scrollbar shrink-0">
              {/* Draft Reply button */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleDraftReply}
                  disabled={isDraftingReply || isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-violet-900/40 hover:bg-violet-800/50 text-violet-200 border border-violet-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isDraftingReply ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  Draft Reply
                </button>
                <select
                  value={draftTone}
                  onChange={(e) => setDraftTone(e.target.value as typeof draftTone)}
                  className="text-[10px] bg-[#18181B] border border-[#27272A] text-[#A1A1AA] rounded-lg px-1.5 py-1.5 focus:outline-none focus:border-violet-600"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="apologetic">Apologetic</option>
                </select>
              </div>

              {/* Report Dropdown */}
              <div className="relative shrink-0" ref={reportMenuRef}>
                <button
                  onClick={() => setShowReportMenu((p) => !p)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-300 border border-emerald-800/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <BarChart3 size={11} />
                  Reports
                  <ChevronDown size={10} className={`transition-transform ${showReportMenu ? "rotate-180" : ""}`} />
                </button>
                {showReportMenu && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl z-10 overflow-hidden">
                    {REPORT_TYPES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleGenerateReport(r.id)}
                        className="w-full text-left px-3 py-2 text-[11px] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white transition-colors"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === "assistant"
                        ? "bg-gradient-to-br from-violet-600 to-violet-800"
                        : "bg-[#27272A]"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot size={13} className="text-white" />
                    ) : (
                      <User size={13} className="text-[#A1A1AA]" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div
                      className={`rounded-2xl px-3 py-2.5 text-[12px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-violet-700 text-white rounded-tr-sm"
                          : "bg-[#18181B] border border-[#27272A] text-[#E4E4E7] rounded-tl-sm"
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2 text-[#71717A]">
                          <Loader2 size={12} className="animate-spin" />
                          <span>AI is thinking...</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">{renderContent(msg.content)}</div>
                      )}
                    </div>

                    {/* Copy button for assistant messages */}
                    {msg.role === "assistant" && !msg.isLoading && msg.content && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#52525B] hover:text-[#A1A1AA] transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <><Check size={9} className="text-emerald-400" /> Copied</>
                        ) : (
                          <><Copy size={9} /> Copy</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-2 border-t border-[#27272A] overflow-x-auto no-scrollbar shrink-0">
              <div className="flex gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.prompt)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    {p.icon}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="px-3 py-3 border-t border-[#27272A] shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about POs, stock, orders, payments..."
                  rows={2}
                  disabled={isLoading}
                  className="flex-1 resize-none bg-[#18181B] border border-[#27272A] focus:border-violet-600 text-[#E4E4E7] placeholder:text-[#52525B] rounded-xl px-3 py-2.5 text-[12px] focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:bg-[#27272A] disabled:cursor-not-allowed text-white transition-colors shrink-0"
                >
                  {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <p className="text-[9px] text-[#3F3F46] mt-1.5 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
