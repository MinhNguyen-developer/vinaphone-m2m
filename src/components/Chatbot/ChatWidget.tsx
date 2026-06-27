import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input, Spin, Tag, Tooltip, Typography, notification } from "antd";
import {
  CloseOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { streamChat, triggerIndex, type ChatStreamEvent } from "../../api/chat.api";
import type { TextAreaRef } from "antd/es/input/TextArea";

const { Text } = Typography;

// ── Tool display names ────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  search_sims: "Tìm kiếm SIM",
  search_alerts: "Cảnh báo",
  search_groups: "Nhóm thiết bị",
  search_usage_history: "Lịch sử sử dụng",
  get_data_statistics: "Thống kê tổng quan",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  /** Tools currently executing (empty once they finish) */
  activeTools?: string[];
  /** All tools called in this response (kept after done for display) */
  toolsUsed?: string[];
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Split text into regular segments and fenced code blocks */
function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const body = part.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      return (
        <pre
          key={i}
          style={{
            background: "#1e1e2e",
            color: "#cdd6f4",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            margin: "6px 0",
            whiteSpace: "pre",
            fontFamily: "'Fira Code', 'Consolas', monospace",
          }}
        >
          {body}
        </pre>
      );
    }
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {part}
      </span>
    );
  });
}

// ── ChatWidget ────────────────────────────────────────────────────────────────

const SUGGESTED = [
  "Có bao nhiêu SIM đang hoạt động?",
  "Có cảnh báo nào vi phạm không?",
  "Hiển thị thống kê tổng quan",
];

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [notifApi, notifHolder] = notification.useNotification();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => textAreaRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const userId = `u-${Date.now()}`;
      const aiId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content },
        {
          id: aiId,
          role: "assistant",
          content: "",
          isStreaming: true,
          activeTools: [],
          toolsUsed: [],
        },
      ]);
      setInput("");
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (id: string, updater: (m: Message) => Message) =>
        setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));

      try {
        await streamChat(
          content,
          sessionId,
          (event: ChatStreamEvent) => {
            if (event.type === "token") {
              patch(aiId, (m) => ({
                ...m,
                content: m.content + (event.content ?? ""),
              }));
            } else if (event.type === "tool_start" && event.name) {
              patch(aiId, (m) => ({
                ...m,
                activeTools: [...(m.activeTools ?? []), event.name!],
                toolsUsed: [...(m.toolsUsed ?? []), event.name!],
              }));
            } else if (event.type === "tool_end" && event.name) {
              patch(aiId, (m) => ({
                ...m,
                activeTools: (m.activeTools ?? []).filter(
                  (t) => t !== event.name,
                ),
              }));
            } else if (event.type === "done") {
              if (event.session_id) setSessionId(event.session_id);
              patch(aiId, (m) => ({
                ...m,
                isStreaming: false,
                activeTools: [],
              }));
              setIsLoading(false);
            } else if (event.type === "error") {
              patch(aiId, (m) => ({
                ...m,
                isStreaming: false,
                activeTools: [],
                error: event.message ?? "Đã xảy ra lỗi.",
              }));
              setIsLoading(false);
            }
          },
          controller.signal,
        );
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          patch(aiId, (m) => ({
            ...m,
            isStreaming: false,
            activeTools: [],
            error: "Lỗi kết nối. Vui lòng thử lại.",
          }));
        }
        setIsLoading(false);
      }
    },
    [input, isLoading, sessionId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setIsOpen(false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setIsLoading(false);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await triggerIndex();
      const { sims, alerts, groups, masterSims, usageHistory } = result.stats;
      notifApi.success({
        message: "Đồng bộ dữ liệu thành công",
        description: `Đã lập chỉ mục ${sims} SIM, ${alerts} cảnh báo, ${groups} nhóm, ${masterSims} SIM chủ, ${usageHistory} lịch sử.`,
        duration: 6,
      });
    } catch (err: unknown) {
      notifApi.error({
        message: "Đồng bộ thất bại",
        description:
          err instanceof Error ? err.message : "Không thể kết nối AI agent.",
        duration: 6,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {notifHolder}
      {/* ── Floating toggle button ── */}
      <Tooltip title="Trợ lý AI M2M" placement="left">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined style={{ fontSize: 22 }} />}
          onClick={() => setIsOpen((v) => !v)}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            width: 56,
            height: 56,
            boxShadow: "0 4px 16px rgba(24,144,255,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s",
          }}
        />
      </Tooltip>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 28,
            width: 380,
            height: 560,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
            border: "1px solid #e8e8e8",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RobotOutlined style={{ color: "#fff", fontSize: 18 }} />
              <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                Trợ lý AI M2M
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Tooltip title="Đồng bộ dữ liệu AI vào Qdrant">
                <Button
                  type="text"
                  size="small"
                  icon={
                    <SyncOutlined
                      spin={isSyncing}
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}
                    />
                  }
                  onClick={handleSync}
                  disabled={isSyncing}
                />
              </Tooltip>
              {messages.length > 0 && (
                <Tooltip title="Xoá hội thoại">
                  <Button
                    type="text"
                    size="small"
                    style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}
                    onClick={handleClear}
                  >
                    Xoá
                  </Button>
                </Tooltip>
              )}
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined style={{ color: "#fff" }} />}
                onClick={handleClose}
              />
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              background: "#f7f8fa",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 12,
                  color: "#8c8c8c",
                  textAlign: "center",
                }}
              >
                <RobotOutlined style={{ fontSize: 40, color: "#1890ff" }} />
                <Text style={{ color: "#595959", fontWeight: 500 }}>
                  Xin chào! Tôi có thể giúp gì cho bạn?
                </Text>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    width: "100%",
                  }}
                >
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        background: "#fff",
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "#1890ff",
                        textAlign: "left",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.background = "#e6f4ff")
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.background = "#fff")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: msg.role === "user" ? "#1890ff" : "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <UserOutlined style={{ color: "#fff", fontSize: 14 }} />
                  ) : (
                    <RobotOutlined style={{ color: "#1890ff", fontSize: 14 }} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {/* Active tool indicators */}
                  {msg.role === "assistant" &&
                    (msg.activeTools ?? []).length > 0 && (
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {(msg.activeTools ?? []).map((tool) => (
                          <Tag
                            key={tool}
                            icon={
                              <Spin
                                indicator={
                                  <LoadingOutlined
                                    style={{ fontSize: 10 }}
                                    spin
                                  />
                                }
                              />
                            }
                            style={{ fontSize: 11, borderRadius: 12 }}
                          >
                            {TOOL_LABELS[tool] ?? tool}
                          </Tag>
                        ))}
                      </div>
                    )}

                  {/* Message content bubble */}
                  <div
                    style={{
                      background: msg.role === "user" ? "#1890ff" : "#fff",
                      color: msg.role === "user" ? "#fff" : "#262626",
                      padding: "8px 12px",
                      borderRadius:
                        msg.role === "user"
                          ? "16px 4px 16px 16px"
                          : "4px 16px 16px 16px",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      border:
                        msg.role === "assistant" ? "1px solid #e8e8e8" : "none",
                      minHeight: 36,
                    }}
                  >
                    {msg.error ? (
                      <span style={{ color: "#ff4d4f" }}>{msg.error}</span>
                    ) : msg.isStreaming && !msg.content ? (
                      /* Typing indicator while waiting for first token */
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: "2px 0",
                        }}
                      >
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#1890ff",
                              display: "inline-block",
                              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        {renderContent(msg.content)}
                        {msg.isStreaming && (
                          <span
                            style={{
                              display: "inline-block",
                              width: 2,
                              height: "1em",
                              background: "#1890ff",
                              marginLeft: 2,
                              verticalAlign: "text-bottom",
                              animation: "blink-cursor 0.8s step-end infinite",
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Tools used summary (shown after done) */}
                  {msg.role === "assistant" &&
                    !msg.isStreaming &&
                    (msg.toolsUsed ?? []).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 3,
                          marginTop: 2,
                        }}
                      >
                        {[...new Set(msg.toolsUsed)].map((tool) => (
                          <Tag
                            key={tool}
                            color="blue"
                            style={{
                              fontSize: 10,
                              borderRadius: 10,
                              padding: "0 6px",
                              opacity: 0.7,
                            }}
                          >
                            {TOOL_LABELS[tool] ?? tool}
                          </Tag>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "10px 12px",
              background: "#fff",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <Input.TextArea
              ref={textAreaRef as React.Ref<TextAreaRef>}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={isLoading}
              style={{
                flex: 1,
                borderRadius: 10,
                resize: "none",
                fontSize: 13,
              }}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              loading={isLoading}
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes typing-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ChatWidget;
