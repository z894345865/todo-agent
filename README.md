# TODO with Agent

一个面向个人和内网使用的 TODO 多视图应用，集成了 [PageAgent](https://github.com/alibaba/page-agent)。你可以手动维护任务，也可以通过右下角聊天面板让 AI 创建、查询、更新任务。

## 功能特性

- **多视图任务库**：支持表格、看板、日历视图。
- **字段、筛选、排序、分组**：表格视图支持字段显示、筛选、排序和真实分组展示；看板和日历保留适合各自视图的操作。
- **任务属性**：支持状态、优先级、标签、截止日期、完成日期、更新时间等字段。
- **标签管理**：可以创建、选择、删除标签。
- **AI 辅助**：通过自然语言创建任务、筛选任务、完成任务、查询统计。
- **本地 JSON 存储**：开发模式下数据保存在 `.local-data/task-data.json`。
- **内网访问保护**：首次访问可设置访问密码，后续读写任务数据需要登录。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/z894345865/todo-agent.git
cd todo-agent
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 LLM Provider

PageAgent 使用 OpenAI 兼容的 LLM API。复制环境变量模板后填写自己的模型配置：

```bash
cp .env.example .env
```

```env
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

本机访问：

```text
http://localhost:5173/
```

内网访问时，Vite 会输出类似下面的地址：

```text
http://192.168.0.110:5173/
```

首次访问会进入“设置访问密码”页面。设置完成后，当前浏览器会自动登录。

## 密码登录

开发服务器提供了轻量的单密码保护：

- 密码不会明文保存，会使用 `scrypt` 加盐哈希后写入 `.local-data/auth-data.json`。
- 登录成功后，浏览器会把 session token 保存在 `sessionStorage`。
- `__task_data` 和 `__todo_data` 数据接口会校验登录态，未登录请求会返回 `401`。
- `.local-data/` 已在 `.gitignore` 中，不应提交真实数据或密码哈希。

如果忘记密码，可以在停止 dev server 后删除：

```bash
rm .local-data/auth-data.json
```

然后重启 `npm run dev`，再次访问页面会重新进入密码设置流程。

## 内网访问与 HTTPS

当前密码登录可以防止同一内网中的随手访问，但如果要长期在内网使用，仍建议提供 HTTPS 安全上下文。

开发期可以用 `mkcert` 给 Vite 配本地可信证书：

```bash
brew install mkcert
mkcert -install
mkdir -p certs
mkcert -cert-file certs/dev.pem -key-file certs/dev-key.pem 192.168.0.110 localhost 127.0.0.1
```

然后在 `vite.config.ts` 的 `server` 中加入：

```ts
server: {
  host: '0.0.0.0',
  https: {
    key: readFileSync('certs/dev-key.pem'),
    cert: readFileSync('certs/dev.pem'),
  },
}
```

证书私钥不要提交到仓库，建议把 `certs/` 加入 `.gitignore`。

## 数据存储

开发模式下主要数据文件位于 `.local-data/`：

| 文件 | 说明 |
|------|------|
| `.local-data/task-data.json` | 当前多视图任务库数据 |
| `.local-data/todo-data.json` | 旧版 TODO 数据接口使用的数据 |
| `.local-data/auth-data.json` | 访问密码的加盐哈希 |

这些文件只保存在本机，不会自动同步到远端。

## AI 交互示例

在页面右下角聊天面板中，可以输入：

| 命令 | 说明 |
|------|------|
| `帮我添加一个任务：整理 README` | 创建新任务 |
| `把“整理 README”标记为完成` | 将指定任务标记为完成 |
| `列出所有 TODO 标签的任务` | 按标签查询任务 |
| `查询已经逾期的任务` | 查询逾期任务 |
| `查询今日统计` | 查看任务统计 |

## 常用命令

```bash
npm run dev      # 启动开发服务器
npm test         # 运行测试
npm run build    # TypeScript 检查并构建
```

## 项目结构

```text
server/
└── auth.ts                 # Vite dev server 使用的密码登录与会话校验
src/
├── auth/                   # 前端登录门禁和认证请求
├── agent/                  # PageAgent 工具与提示词
├── components/             # UI 组件
│   └── multiview/          # 表格、看板、日历任务视图
├── db/                     # 旧版 TODO 数据读写
├── tasks/                  # 多视图任务模型、存储、工具
├── utils/                  # 通用工具
├── App.tsx
└── main.tsx
tests/                      # Node test 测试
```

## 注意事项

- 修改 `vite.config.ts` 的中间件后，需要重启 `npm run dev` 才会生效。
- 内网 HTTP 不是安全上下文，部分浏览器 API 可能不可用；项目内的客户端 ID 生成已经做了兼容处理。
- 当前认证是面向个人/内网使用的轻量保护，不是完整多用户账号系统。

## License

MIT
