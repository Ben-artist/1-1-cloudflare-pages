# DeepSeek AI 聊天应用

一个基于 React + Vite 的现代化 AI 聊天应用，集成了 DeepSeek AI 和百度地图服务，支持多对话管理和流式响应。

## ✨ 功能特性

### 🤖 AI 聊天功能
- **DeepSeek AI 集成**: 使用 DeepSeek AI API 进行智能对话
- **流式响应**: 支持 Server-Sent Events (SSE) 实时流式输出
- **Markdown 渲染**: 支持 Markdown 格式的消息显示
- **多轮对话**: 保持完整的对话上下文

### 💬 对话管理
- **多对话支持**: 使用 Ant Design X 的 Conversations 组件管理多个对话
- **对话分组**: 按时间自动分组（今天、昨天、更早）
- **对话操作**: 支持创建、重命名、删除对话
- **对话切换**: 快速在不同对话间切换

### 🗺️ 地图服务
- **百度地图集成**: 地点搜索、详情查询、路线规划
- **天气查询**: 实时天气信息和预报
- **地理编码**: 地址与坐标转换
- **交通信息**: 道路拥堵状态查询

## 🏗️ 技术架构

### 前端技术栈
- **React 18**: 现代化的 React 框架
- **Vite**: 快速的构建工具
- **Tailwind CSS**: 原子化 CSS 框架
- **Ant Design X**: 新一代 UI 组件库
- **Ant Design**: 企业级 UI 设计语言

### 后端服务
- **Node.js**: 服务器运行环境
- **Express**: Web 应用框架
- **Cloudflare Pages**: 前端部署平台
- **Cloudflare Workers**: 边缘计算服务

### API 集成
- **DeepSeek AI API**: AI 对话服务
- **百度地图 API**: 地图和位置服务
- **MCP (Model Context Protocol)**: 模型上下文协议

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- pnpm >= 7.0.0

### 安装依赖
```bash
# 安装前端依赖
pnpm install

# 安装后端依赖
cd server
pnpm install
```

### 环境配置
1. 复制环境变量模板文件：
```bash
cd server
cp env.example .env
```

2. 配置必要的环境变量：
```bash
# .env 文件
BAIDU_MAP_API_KEY=你的百度地图API密钥
DEEPSEEK_API_KEY=你的DeepSeek API密钥
PORT=3001
```

### 启动开发服务器
```bash
# 启动前端开发服务器
pnpm dev

# 启动后端代理服务器（新终端）
cd server
pnpm start
```

### 构建和部署
```bash
# 构建前端
pnpm build

# 部署到 Cloudflare Pages
pnpm deploy
```

## 📱 使用方法

### 聊天功能
1. **发送消息**: 在输入框中输入问题，按 Enter 发送
2. **流式响应**: AI 会实时流式输出回答内容
3. **Markdown 支持**: 支持代码块、列表、链接等 Markdown 格式

### 对话管理
1. **创建对话**: 点击右上角"新对话"按钮
2. **切换对话**: 点击左侧对话列表中的任意对话
3. **重命名对话**: 右键对话 → 重命名
4. **删除对话**: 右键对话 → 删除（至少保留一个对话）

### 地图服务
1. **地点搜索**: 输入关键词搜索地点
2. **详情查看**: 点击搜索结果查看详细信息
3. **路线规划**: 设置起点和终点进行路线规划
4. **天气查询**: 查看指定位置的天气信息

## 🔧 项目结构

```
1-1-cloudflare-page/
├── src/                    # 前端源代码
│   ├── components/        # React 组件
│   │   ├── ChatBox.jsx   # 聊天主组件
│   │   └── MapComponent.jsx # 地图组件
│   ├── App.jsx           # 主应用组件
│   └── main.jsx          # 应用入口
├── server/                # 后端服务
│   ├── mcp-proxy.js      # MCP 代理服务器
│   └── package.json      # 后端依赖
├── functions/             # Cloudflare Workers
│   └── api-map.js        # 地图 API 端点
├── public/                # 静态资源
├── package.json           # 前端依赖配置
└── README.md              # 项目说明文档
```

## 🌟 核心组件

### ChatBox 组件
- 集成 Ant Design X 的 Conversations 组件
- 支持多对话管理和切换
- 实现流式 AI 响应
- Markdown 消息渲染

### MapComponent 组件
- 百度地图服务集成
- 地点搜索和详情展示
- 路线规划和天气查询
- 地理编码服务

## 🔌 API 端点

### 前端 API
- `/api/*`: 通过 Cloudflare Workers 代理到后端服务

### 后端 API
- `POST /api/chat`: DeepSeek AI 聊天接口
- `GET /api/map/search`: 地点搜索
- `GET /api/map/details`: 地点详情
- `GET /api/map/weather`: 天气查询
- `GET /api/map/directions`: 路线规划

## 🚀 部署说明

### Cloudflare Pages 部署
1. 连接 GitHub 仓库到 Cloudflare Pages
2. 设置构建命令：`pnpm build`
3. 设置输出目录：`dist`
4. 配置环境变量（API 密钥等）

### 后端服务部署
1. 部署到支持 Node.js 的服务器
2. 配置环境变量
3. 使用 PM2 或 Docker 管理进程

## 🐛 常见问题

### 前端问题
- **构建失败**: 检查 Node.js 版本和依赖安装
- **样式问题**: 确认 Tailwind CSS 配置正确
- **组件加载失败**: 检查 Ant Design 依赖版本

### 后端问题
- **API 调用失败**: 检查环境变量和 API 密钥
- **CORS 错误**: 确认跨域配置正确
- **端口占用**: 修改 .env 中的端口配置

## 📈 性能优化

- **代码分割**: 使用 React.lazy 进行组件懒加载
- **缓存策略**: 实现对话和地图数据的本地缓存
- **图片优化**: 使用 WebP 格式和懒加载
- **Bundle 优化**: 分析并优化打包体积

## 🔒 安全考虑

- **API 密钥**: 使用环境变量存储敏感信息
- **输入验证**: 前端和后端双重验证用户输入
- **CORS 配置**: 限制允许的跨域来源
- **HTTPS**: 生产环境强制使用 HTTPS

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 提交代码更改
4. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**注意**: 使用前请确保已获取必要的 API 密钥，并遵守相关服务的使用条款。
