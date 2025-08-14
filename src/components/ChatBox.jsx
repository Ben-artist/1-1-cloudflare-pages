import { useEffect, useRef, useState } from "react";
import { Bubble, Sender, Conversations } from "@ant-design/x";
import {
  UserOutlined,
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { Button, Modal, Input, message, Spin } from "antd";
import { useMutation, gql } from "@apollo/client";
import markdownit from "markdown-it";

const md = markdownit({ html: true, breaks: true });

const CHAT_MUTATION = gql`
  mutation Chat($message: String!) {
    chat(message: $message)
  }
`;

const fooAvatar = {
  color: "#f56a00",
  backgroundColor: "#fde3cf",
};

const barAvatar = {
  color: "#fff",
  backgroundColor: "#87d068",
};

const renderMarkdown = content => {
  return <div dangerouslySetInnerHTML={{ __html: md.render(content || "") }} />;
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

function ChatBox({ client }) {
  // 对话管理状态
  const [conversations, setConversations] = useState([
    {
      key: "default",
      label: "默认对话",
      timestamp: Date.now(),
      group: "今天",
      messages: [
        {
          role: "assistant",
          content: "你好，我是 DeepSeek 助手。有什么想聊的？",
        },
      ],
    },
  ]);

  const [currentConversationKey, setCurrentConversationKey] =
    useState("default");
  const [senderValue, setSenderValue] = useState("");
  const [loadingStates, setLoadingStates] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConversation, setEditingConversation] = useState(null);
  const [newConversationName, setNewConversationName] = useState("");

  const listRef = useRef(null);

  // Apollo mutation hook
  const [chat, { loading, error }] = useMutation(CHAT_MUTATION, { client });

  // 获取当前对话
  const currentConversation = conversations.find(
    c => c.key === currentConversationKey
  );
  const currentMessages = currentConversation?.messages || [];
  const isCurrentLoading = loadingStates[currentConversationKey] || false;

  // 自动滚动到最新消息
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentMessages, isCurrentLoading]);

  // 创建新对话
  const createNewConversation = () => {
    const newKey = `conversation_${Date.now()}`;
    const newConversation = {
      key: newKey,
      label: `新对话 ${conversations.length + 1}`,
      timestamp: Date.now(),
      group: "今天",
      messages: [
        {
          role: "assistant",
          content: "你好，我是 DeepSeek 助手。有什么想聊的？",
        },
      ],
    };

    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationKey(newKey);
    message.success("新对话已创建");
  };

  // 删除对话
  const deleteConversation = conversationKey => {
    if (conversations.length <= 1) {
      message.warning("至少需要保留一个对话");
      return;
    }

    setConversations(prev => prev.filter(c => c.key !== conversationKey));

    if (currentConversationKey === conversationKey) {
      const remainingConversations = conversations.filter(
        c => c.key !== conversationKey
      );
      setCurrentConversationKey(remainingConversations[0]?.key || "default");
    }

    message.success("对话已删除");
  };

  // 编辑对话名称
  const editConversationName = conversation => {
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
          ? {
              ...c,
              messages: newMessages,
              timestamp: Date.now(),
            }
          : c
      )
    );
  };

  // 发送消息
  const sendMessage = async () => {
    const content = senderValue.trim();
    if (!content || isCurrentLoading) return;

    setSenderValue("");
    setLoadingStates(prev => ({ ...prev, [currentConversationKey]: true }));

    // 添加用户消息
    const userMessage = { role: "user", content };
    const nextMessages = [...currentMessages, userMessage];
    updateConversationMessages(currentConversationKey, nextMessages);

    try {
      // 执行 GraphQL mutation
      const { data } = await chat({ variables: { message: content } });

      // 添加助手回复
      const assistantMessage = {
        role: "assistant",
        content: data.chat || "抱歉，没有收到有效回复",
      };
      updateConversationMessages(currentConversationKey, [
        ...nextMessages,
        assistantMessage,
      ]);
    } catch (err) {
      // 处理错误
      const errorMessage = {
        role: "assistant",
        content: `错误: ${err.message || "聊天失败"}`,
      };
      updateConversationMessages(currentConversationKey, [
        ...nextMessages,
        errorMessage,
      ]);
      console.error("聊天失败:", err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [currentConversationKey]: false }));
    }
  };

  // 处理键盘输入
  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 对话菜单配置
  const getConversationMenu = conversation => ({
    items: [
      {
        key: "edit",
        label: "重命名",
        icon: <EditOutlined />,
        onClick: () => editConversationName(conversation),
      },
      {
        key: "delete",
        label: "删除",
        icon: <DeleteOutlined />,
        onClick: () => deleteConversation(conversation.key),
        danger: true,
      },
    ],
  });

  return (
    <div className="mx-auto flex h-dvh max-h-screen w-full max-w-6xl flex-col bg-white">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">DeepSeek 聊天</h1>
          <div className="flex items-center space-x-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={createNewConversation}
              className="mr-2">
              新对话
            </Button>
          </div>
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
                const order = { 今天: 1, 昨天: 2, 更早: 3 };
                return (order[a] || 4) - (order[b] || 4);
              },
              title: group => {
                const groupNames = {
                  今天: "今天",
                  昨天: "昨天",
                  更早: "更早",
                };
                return groupNames[group] || group;
              },
            }}
          />
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col">
          <div className="border-b p-2 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">
                {currentConversation?.label}
              </div>
            </div>
          </div>

          <main ref={listRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="flex flex-col gap-2">
              {currentMessages.map((m, idx) => (
                <MessageBubble key={idx} role={m.role} content={m.content} />
              ))}
            </div>
            {isCurrentLoading && (
              <div className="text-center mt-2 text-xs text-gray-500">
                <Spin /> 正在处理...
              </div>
            )}
            {error && (
              <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
                {error.message}
              </div>
            )}
          </main>

          <div className="border-t p-3">
            <Sender
              value={senderValue}
              placeholder="输入你的问题，按 Enter 发送"
              onChange={value => setSenderValue(value)}
              onSubmit={sendMessage}
              disabled={isCurrentLoading}
              onKeyDown={handleKeyDown}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              输入消息并按 Enter 发送
            </div>
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
        cancelText="取消">
        <Input
          value={newConversationName}
          onChange={e => setNewConversationName(e.target.value)}
          placeholder="请输入对话名称"
          onPressEnter={saveConversationName}
          autoFocus
        />
      </Modal>
    </div>
  );
}

export default ChatBox;
