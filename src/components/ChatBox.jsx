import { useEffect, useRef, useState } from "react";
import { Bubble, Sender, Conversations } from "@ant-design/x";
import { UserOutlined, RobotOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Modal, Input, message } from "antd";
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
  // 对话管理状态
  const [conversations, setConversations] = useState([
    {
      key: "default",
      label: "默认对话",
      timestamp: Date.now(),
      group: "今天",
      messages: [
        { role: "assistant", content: "你好，我是 DeepSeek 助手。有什么想聊的？" },
      ]
    }
  ]);
  
  const [currentConversationKey, setCurrentConversationKey] = useState("default");
  const [senderValue, setSenderValue] = useState("");
  const [loadingStates, setLoadingStates] = useState({}); // 每个会话的独立加载状态
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConversation, setEditingConversation] = useState(null);
  const [newConversationName, setNewConversationName] = useState("");
  
  const listRef = useRef(null);
  const systemMessage = useRef({
    role: "system",
    content: "You are a helpful assistant.",
  });

  // 获取当前对话
  const currentConversation = conversations.find(c => c.key === currentConversationKey);
  const currentMessages = currentConversation?.messages || [];
  const currentLoading = loadingStates[currentConversationKey] || false;

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [currentMessages, currentLoading]);

  // 创建新对话
  const createNewConversation = () => {
    const newKey = `conversation_${Date.now()}`;
    const newConversation = {
      key: newKey,
      label: `新对话 ${conversations.length + 1}`,
      timestamp: Date.now(),
      group: "今天",
      messages: [
        { role: "assistant", content: "你好，我是 DeepSeek 助手。有什么想聊的？" },
      ]
    };
    
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationKey(newKey);
    message.success("新对话已创建");
  };

  // 删除对话
  const deleteConversation = (conversationKey) => {
    if (conversations.length <= 1) {
      message.warning("至少需要保留一个对话");
      return;
    }
    
    setConversations(prev => prev.filter(c => c.key !== conversationKey));
    
    if (currentConversationKey === conversationKey) {
      const remainingConversations = conversations.filter(c => c.key !== conversationKey);
      setCurrentConversationKey(remainingConversations[0]?.key || "default");
    }
    
    message.success("对话已删除");
  };

  // 编辑对话名称
  const editConversationName = (conversation) => {
    setEditingConversation(conversation);
    setNewConversationName(conversation.label);
    setIsModalVisible(true);
  };

  // 保存对话名称
  const saveConversationName = () => {
    if (!newConversationName.trim()) {
      message.warning("对话名称不能为空");
      return;
    }
    
    setConversations(prev => 
      prev.map(c => 
        c.key === editingConversation.key 
          ? { ...c, label: newConversationName.trim() }
          : c
      )
    );
    
    setIsModalVisible(false);
    setEditingConversation(null);
    setNewConversationName("");
    message.success("对话名称已更新");
  };

  // 更新对话消息
  const updateConversationMessages = (conversationKey, newMessages) => {
    setConversations(prev => 
      prev.map(c => 
        c.key === conversationKey 
          ? { ...c, messages: newMessages, timestamp: Date.now() }
          : c
      )
    );
  };

  async function send(contentRaw) {
    const content = (contentRaw ?? "").trim();
    if (!content || currentLoading) return;
    setError("");
    
    // 发送后清空输入
    setSenderValue("");
    
    // 更新当前对话的消息
    const nextMessages = [...currentMessages, { role: "user", content }];
    updateConversationMessages(currentConversationKey, nextMessages);
    
    // 设置当前会话的加载状态
    setLoadingStates(prev => ({ ...prev, [currentConversationKey]: true }));

    try {
      const res = await fetch("https://ai-talk.life/api", {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages,
          system: systemMessage.current,
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
      
      updateConversationMessages(currentConversationKey, [...nextMessages, { role: "assistant", content: "" }]);

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
                const updatedMessages = [...nextMessages, { role: "assistant", content: assistantAccum }];
                updateConversationMessages(currentConversationKey, updatedMessages);
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
      // 清除当前会话的加载状态
      setLoadingStates(prev => ({ ...prev, [currentConversationKey]: false }));
    }
  }

  // 对话菜单配置
  const getConversationMenu = (conversation) => ({
    items: [
      {
        key: 'edit',
        label: '重命名',
        icon: <EditOutlined />,
        onClick: () => editConversationName(conversation)
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        onClick: () => deleteConversation(conversation.key),
        danger: true
      }
    ]
  });

  return (
    <div className="mx-auto flex h-dvh max-h-screen w-full max-w-6xl flex-col bg-white">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">DeepSeek 聊天</h1>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={createNewConversation}
          >
            新对话
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧对话列表 */}
        <div className="w-80 border-r bg-gray-50 p-4">
          <Conversations
            items={conversations}
            activeKey={currentConversationKey}
            onActiveChange={setCurrentConversationKey}
            menu={getConversationMenu}
            groupable={{
              sort: (a, b) => {
                const order = { '今天': 1, '昨天': 2, '更早': 3 };
                return (order[a] || 4) - (order[b] || 4);
              },
              title: (group) => {
                const groupNames = {
                  '今天': '今天',
                  '昨天': '昨天',
                  '更早': '更早'
                };
                return groupNames[group] || group;
              }
            }}
          />
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col">
          <main ref={listRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="flex flex-col gap-2">
              {currentMessages.map((m, idx) => (
                <MessageBubble key={idx} role={m.role} content={m.content} />
              ))}
            </div>
            {currentLoading && (
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
              value={senderValue}
              placeholder="输入你的问题，按 Enter 发送（Shift+Enter 换行）"
              onChange={value => {
                setSenderValue(value);
              }}
              onSubmit={() => {
                send(senderValue);
              }}
              disabled={currentLoading}
            />
          </div>
        </div>
      </div>

      {/* 重命名对话的模态框 */}
      <Modal
        title="重命名对话"
        open={isModalVisible}
        onOk={saveConversationName}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingConversation(null);
          setNewConversationName("");
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newConversationName}
          onChange={(e) => setNewConversationName(e.target.value)}
          placeholder="请输入对话名称"
          onPressEnter={saveConversationName}
          autoFocus
        />
      </Modal>
    </div>
  );
}
