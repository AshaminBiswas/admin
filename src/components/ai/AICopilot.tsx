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
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Inbox,
  AlertTriangle,
  CreditCard,
  Truck,
  TrendingUp,
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

interface QuickPrompt {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: <BarChart3 size={13} />,
    label: "Executive Summary",
    prompt: "Generate an executive summary of business performance this month",
  },
  {
    icon: <Inbox size={13} />,
    label: "PO Analysis",
    prompt: "Analyze recent purchase orders and give me key insights",
  },
  {
    icon: <AlertTriangle size={13} />,
    label: "Low Stock Alert",
    prompt: "Which products are running low on stock and need immediate reordering?",
  },
  {
    icon: <CreditCard size={13} />,
    label: "Payment Issues",
    prompt: "Are there any failed or pending payments that need follow-up?",
  },
  {
    icon: <Truck size={13} />,
    label: "Dispatch Status",
    prompt: "Check recent customer orders and courier dispatch status",
  },
  {
    icon: <FileText size={13} />,
    label: "Pending Quotations",
    prompt: "Summarize pending B2B quotations waiting for approval",
  },
  {
    icon: <TrendingUp size={13} />,
    label: "Revenue Trends",
    prompt: "Show sales revenue trends and high-value orders this month",
  },
];

interface ReportOption {
  id: ReportType;
  label: string;
  desc: string;
  icon: string;
}

const REPORT_TYPES: ReportOption[] = [
  {
    id: "executive_summary",
    label: "Executive Summary",
    desc: "Orders, Revenue & PO highlights",
    icon: "📊",
  },
  {
    id: "po_analysis",
    label: "PO & Email Pipeline",
    desc: "Classification, priorities & volume",
    icon: "📦",
  },
  {
    id: "inventory_health",
    label: "Inventory Health",
    desc: "Stockout alerts & reorder thresholds",
    icon: "🏭",
  },
  {
    id: "quotation_pipeline",
    label: "Quotation Pipeline",
    desc: "Approval rates & estimated values",
    icon: "📋",
  },
  {
    id: "payment_reconciliation",
    label: "Payment Reconciliation",
    desc: "Gateways, settlements & failed transactions",
    icon: "💳",
  },
  {
    id: "low_stock_alerts",
    label: "Low Stock Alerts",
    desc: "Immediate reorder recommendations",
    icon: "⚠️",
  },
  {
    id: "revenue_trends",
    label: "Revenue & Sales Trends",
    desc: "Top products and growth metrics",
    icon: "📈",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AICopilot({ currentPoId, currentView }: AICopilotProps) {
  const { adminUser } = useAdminAuth();
  const adminName = adminUser?.firstName
    ? adminUser.firstName
    : adminUser?.email
    ? adminUser.email.split("@")[0]
    : "Admin";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello ${adminName},
What would you like help with today?`,
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

  // ── Drag-to-Scroll State for Suggestions ──
  const promptScrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!promptScrollRef.current) return;
    setIsMouseDown(true);
    hasDragged.current = false;
    dragStartX.current = e.pageX - promptScrollRef.current.offsetLeft;
    dragScrollLeft.current = promptScrollRef.current.scrollLeft;
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !promptScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - promptScrollRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    promptScrollRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleDragEnd = () => {
    setIsMouseDown(false);
  };

  const scrollRibbon = (direction: "left" | "right") => {
    if (!promptScrollRef.current) return;
    const offset = direction === "left" ? -180 : 180;
    promptScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

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
                content: `âš ï¸ **Error**: ${err.message || "Failed to get AI response. Please check your NVIDIA API key in environment variables."}`,
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
        content: "âš ï¸ Please open a specific PO detail page first, then click **Draft Reply** to generate a contextual email reply for that customer.",
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

      const content = `âœ… **AI Email Draft Generated**

**Detected Context:** ${draft.detectedContext}
**Suggested Status:** \`${draft.suggestedStatus}\`

---

**ðŸ“§ Subject:** ${draft.subject}

**ðŸ“ Body:**

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
                content: `âš ï¸ **Draft failed**: ${err.message}`,
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
            ? { ...m, content: `ðŸ“Š **${reportType.replace(/_/g, " ").toUpperCase()} REPORT**\n\n${report.report}`, isLoading: false }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `âš ï¸ **Report failed**: ${err.message}`, isLoading: false }
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
        content: `Hello ${adminName},
What would you like help with today?`,
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

  // ── Render Markdown-like formatting ──
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
      if (line.startsWith("# ")) return <p key={i} className="font-bold text-base mt-2 text-white" dangerouslySetInnerHTML={{ __html: withCode.slice(2) }} />;
      if (line.startsWith("## ")) return <p key={i} className="font-semibold mt-2 text-violet-200" dangerouslySetInnerHTML={{ __html: withCode.slice(3) }} />;
      if (line.startsWith("### ")) return <p key={i} className="font-medium mt-1 text-slate-200" dangerouslySetInnerHTML={{ __html: withCode.slice(4) }} />;
      // List items
      if (line.startsWith("• ") || line.startsWith("- ")) return (
        <p key={i} className="flex gap-1.5 ml-1" dangerouslySetInnerHTML={{ __html: "• " + withCode.slice(2) }} />
      );
      return <p key={i} dangerouslySetInnerHTML={{ __html: withCode || "&nbsp;" }} />;
    });
  };

  return (
    <>
      {/* â”€â”€ Floating Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 bg-gradient-to-br from-violet-600 to-violet-800 hover:from-violet-500 hover:to-violet-700 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-violet-900/40 transition-all duration-200 active:scale-95 group"
          title="Open PRC PILOT"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-semibold hidden sm:inline">PRC PILOT</span>
        </button>
      )}

      {/* â”€â”€ Sidebar Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <p className="text-sm font-bold text-white">PRC PILOT</p>
                  <p className="text-[10px] text-violet-400">llama-3.2-90b-vision Â· NVIDIA NIM</p>
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
              <div className="px-3 py-2 bg-violet-950/40 border-b border-violet-900/40 shrink-0 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="text-[11px] text-violet-200 truncate">
                  PO context active: <span className="font-semibold text-white">AI can draft replies for this PO</span>
                </p>
              </div>
            )}

            {/* ── Quick Action Bar (relative z-30, NOT overflow-hidden, so dropdown opens freely) ── */}
            <div className="relative z-30 flex items-center justify-between px-3 py-2 border-b border-[#27272A] bg-[#0E0E11] shrink-0">
              {/* Draft Reply controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDraftReply}
                  disabled={isDraftingReply || isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-95"
                >
                  {isDraftingReply ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  <span>Draft Reply</span>
                </button>
                <select
                  value={draftTone}
                  onChange={(e) => setDraftTone(e.target.value as typeof draftTone)}
                  className="text-[10px] bg-[#18181B] border border-[#27272A] text-[#A1A1AA] rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-600 cursor-pointer"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="apologetic">Apologetic</option>
                </select>
              </div>

              {/* ── Working Reports Dropdown with High Z-Index & Clean Modal Popover ── */}
              <div className="relative" ref={reportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowReportMenu((p) => !p)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95 ${
                    showReportMenu
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-500"
                      : "bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
                  }`}
                >
                  <BarChart3 size={12} />
                  <span>Reports</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${showReportMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu Modal */}
                {showReportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#18181B] border border-[#3F3F46] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#27272A] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 bg-gradient-to-r from-emerald-950/80 to-[#18181B]">
                      <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <BarChart3 size={12} className="text-emerald-400" />
                        Generate Live AI Report
                      </p>
                      <p className="text-[9px] text-[#A1A1AA]">Analyzes real-time database metrics</p>
                    </div>
                    <div className="py-1 max-h-72 overflow-y-auto no-scrollbar">
                      {REPORT_TYPES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleGenerateReport(r.id)}
                          className="w-full text-left px-3 py-2 hover:bg-[#27272A] transition-colors group flex items-start gap-2.5"
                        >
                          <span className="text-sm mt-0.5">{r.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-white group-hover:text-emerald-300 transition-colors">
                              {r.label}
                            </p>
                            <p className="text-[9px] text-[#71717A] truncate">{r.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
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

            {/* ── Left/Right Draggable Suggestions Ribbon ── */}
            <div className="px-3 py-2 border-t border-[#27272A] bg-[#09090B] shrink-0 select-none">
              {/* Header Label + Scroll Controls */}
              <div className="flex items-center justify-between text-[9px] text-[#71717A] mb-1.5 px-0.5">
                <span className="flex items-center gap-1 font-medium text-[#A1A1AA]">
                  <Sparkles size={10} className="text-violet-400" />
                  Quick Suggestions (Drag Left / Right ↔)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollRibbon("left")}
                    className="p-1 rounded hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                    title="Scroll left"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRibbon("right")}
                    className="p-1 rounded hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                    title="Scroll right"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Draggable Ribbon */}
              <div className="relative">
                <div
                  ref={promptScrollRef}
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  className={`flex gap-1.5 overflow-x-auto no-scrollbar pb-1 touch-pan-x ${
                    isMouseDown ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{ scrollBehavior: isMouseDown ? "auto" : "smooth" }}
                >
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (hasDragged.current) return;
                        sendMessage(p.prompt);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#18181B] hover:bg-[#27272A] text-[#D4D4D8] hover:text-white border border-[#27272A] hover:border-violet-600/50 transition-all disabled:opacity-40 whitespace-nowrap shrink-0 shadow-sm active:scale-95"
                    >
                      <span className="text-violet-400">{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
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
                Press Enter to send Â· Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


