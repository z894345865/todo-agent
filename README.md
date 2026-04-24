# TODO with Agent

一个极简的 TODO 应用，集成了阿里开源的 [PageAgent](https://github.com/alibaba/page-agent)，AI 可以通过自然语言完成 TODO 的全部操作，并查询统计数据用于生成日报。

## 快速开始

### 克隆项目

```bash
git clone https://github.com/z894345865/todo-agent.git
cd todo-agent
```

## 功能特性

- **手动操作** — 添加、完成、取消完成、删除任务
- **AI 辅助** — 通过自然语言让 AI 操作 TODO（如"帮我添加一个任务：买水果"）
- **日报生成** — AI 可以查询本周完成任务列表，辅助生成工作日报
- **本地存储** — 所有数据保存在浏览器 IndexedDB，刷新不丢失
- **无后端依赖** — 纯前端应用，无需部署服务器

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + Vite + TypeScript |
| 状态管理 | Zustand |
| 数据存储 | IndexedDB（通过 `idb`） |
| AI 集成 | PageAgent（`page-agent` npm 包） |

## 快速开始

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 LLM Provider

PageAgent 支持任意 OpenAI 兼容的 LLM API。

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置你的 LLM provider：

```
VITE_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_LLM_API_KEY=your_api_key_here
VITE_LLM_MODEL=qwen3.5-plus
VITE_LLM_LANGUAGE=zh-CN
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_LLM_BASE_URL` | LLM API 地址（OpenAI 兼容） | — |
| `VITE_LLM_API_KEY` | API Key | — |
| `VITE_LLM_MODEL` | 模型名称 | `qwen3.5-plus` |
| `VITE_LLM_LANGUAGE` | AI 界面语言 | `zh-CN` |

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:5173 即可使用。

## AI 交互示例

在页面右下角的 AI 面板中，可以输入以下自然语言命令：

| 命令 | 说明 |
|------|------|
| `帮我添加一个任务：买水果` | 创建新任务 |
| `标记"买水果"为完成` | 将指定任务标记为完成 |
| `标记"买水果"为未完成` | 重新打开任务 |
| `删除"买水果"` | 删除指定任务 |
| `列出所有任务` | 查看全部任务 |
| `查询今日统计` | 查看今日完成情况 |
| `查询本周完成的任务` | 获取周报素材 |

## 项目结构

```
src/
├── main.tsx              # React 入口
├── App.tsx               # 根组件
├── index.css             # 全局样式
├── db/
│   └── index.ts          # IndexedDB 封装（CRUD + 统计）
├── types/
│   └── index.ts          # 类型定义（Todo, TodoStats）
├── store/
│   └── index.ts          # Zustand 状态管理单例
├── components/
│   ├── TodoInput.tsx     # 任务输入框
│   ├── TodoItem.tsx      # 单条任务
│   ├── TodoList.tsx      # 任务列表
│   ├── StatsPanel.tsx    # 统计面板
│   └── AIPanel.tsx       # PageAgent 包装组件
└── agent/
    └── tools.ts          # 自定义 TODO 工具（暴露给 AI）
```

## 数据模型

```typescript
interface Todo {
  id: string           // UUID
  text: string         // 任务描述
  completed: boolean   // 是否完成
  createdAt: number    // 创建时间戳
  completedAt?: number  // 完成时间戳
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_LLM_BASE_URL` | LLM API 地址（OpenAI 兼容） | — |
| `VITE_LLM_API_KEY` | API Key | — |
| `VITE_LLM_MODEL` | 模型名称 | `qwen3.5-plus` |
| `VITE_LLM_LANGUAGE` | AI 界面语言 | `zh-CN` |

## 注意事项

- 本应用数据存储在浏览器本地，切换浏览器或清除数据会导致 TODO 丢失
- PageAgent 的 AI 面板在右下角浮动，打开应用后需要等待 Panel 加载
- 如果 AI 面板提示 API Key 未设置，请检查 `.env` 文件是否正确配置

## License

MIT
