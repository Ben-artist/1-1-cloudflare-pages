import { useEffect, useRef, useState } from "react";
import { Bubble, Sender } from "@ant-design/x";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import { Typography } from "antd";
// @see https://x.ant.design/components/bubble-cn#bubble-demo-markdown
import markdownit from "markdown-it";

const md = markdownit({ html: true, breaks: true });
const fooAvatar = {
  color: "#f56a00",
  backgroundColor: "#fde3cf",
};

const barAvatar = {
  color: "#fff",
  backgroundColor: "#87d068",
};

const renderMarkdown = content => {
  return <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />;
};
function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <Bubble
      content={renderMarkdown(content)}
      avatar={{
        icon: isUser ? <UserOutlined /> : <RobotOutlined />,
        style: isUser ? fooAvatar : barAvatar,
      }}
      placement={isUser ? "end" : "start"}
    />
  );
}

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "你好，我是 DeepSeek 助手。有什么想聊的？" },
  ]);
  // 输入由 Sender 控件管理
  const [inputValue, setInputValue] = useState("");
  const [senderKey, setSenderKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const systemMessage = useRef({
    role: "system",
    content: "You are a helpful assistant.",
  });

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(contentRaw) {
    const content = (contentRaw ?? "").trim();
    if (!content || loading) return;
    setError("");
    // 清空输入框（受控值 + 强制重挂载）
    setInputValue("");
    setSenderKey(k => k + 1);

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/deepseek/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            import.meta.env.VITE_DEEPSEEK_API_KEY
          }`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            systemMessage.current,
            ...nextMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const contentType = res.headers.get("content-type") || "";

      // 预先插入一个助手回复气泡，用于流式追加内容
      let assistantIndex = -1;
      let assistantAccum = "";
      setMessages(prev => {
        assistantIndex = prev.length;
        return [...prev, { role: "assistant", content: "" }];
      });

      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let isDone = false;

        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const evt of events) {
            const line = evt.trim();
            if (!line) continue;
            const dataLine = line.startsWith("data:")
              ? line.replace(/^data:\s*/, "")
              : "";
            if (!dataLine) continue;
            if (dataLine === "[DONE]") {
              isDone = true;
              break;
            }
            try {
              const json = JSON.parse(dataLine);
              const textDelta = json?.choices?.[0]?.delta?.content || "";
              if (textDelta) {
                assistantAccum += textDelta;
                setMessages(prev => {
                  const copy = [...prev];
                  const idx =
                    assistantIndex >= 0 ? assistantIndex : copy.length - 1;
                  copy[idx] = { role: "assistant", content: assistantAccum };
                  return copy;
                });
              }
            } catch {
              // 忽略无法解析的片段
            }
          }
        }
      } else {
        throw new Error(
          "服务器未返回 SSE（text/event-stream）。请确认已设置 stream: true。"
        );
      }
    } catch (err) {
      setError(err?.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-h-screen w-full max-w-3xl flex-col bg-white">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">DeepSeek 聊天</h1>
      </header>

      <main ref={listRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="flex flex-col gap-2">
          {messages.map((m, idx) => (
            <MessageBubble key={idx} role={m.role} content={m.content} />
          ))}
        </div>
        {loading && (
          <div className="mt-2 text-center text-xs text-gray-500">
            对方正在输入…
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </main>

      <div className="border-t p-3">
        <Sender
          placeholder="输入你的问题，按 Enter 发送（Shift+Enter 换行）"
          onSubmit={val => {
            if (val && val.trim()) {
              send(val);
            }
          }}
          disabled={loading}
        />
      </div>
    </div>
  );
}
