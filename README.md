# 笔灵 (Novel Forge) — AI 小说写作助手

一款基于 Next.js 的中文小说写作工具，集成 AI 辅助写作、大纲管理、角色卡、灵感讨论等功能。

## 环境要求

- [Node.js](https://nodejs.org/) 18+
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/)）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制环境变量模板并填入你的 DeepSeek API Key：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，将 `sk-xxxxxxxxxxxxxxxxxxxxxxxx` 替换为你的真实 Key：

```
DEEPSEEK_API_KEY=sk-你的真实key
```

### 3. 启动

```bash
npm run dev
```

或者在 Windows 上双击 `start.bat`（自动打开浏览器）。

浏览器访问 http://localhost:3000

## 功能

- **富文本编辑器**：基于 TipTap，支持字号调整、加粗、斜体、引用、撤销/重做
- **AI 写作助手**：选中正文后一键润色、扩写、精简、重写，支持采纳/对比/忽略
- **AI 灵感讨论**：多 AI 角色（编剧、读者、编辑、设定控）参与讨论
- **章节目录**：拖拽排序，自动保存
- **大纲管理**：卷/章/场景树形结构，拖拽排序，AI 自动补充大纲
- **角色卡**：角色信息管理，关系图谱，AI 从正文自动提取角色
- **故事线**：管理多线叙事
- **伏笔追踪**：在大纲节点中标记埋设和回收状态
- **版本历史**：快照保存（Ctrl+Shift+S），随时回退
- **导出**：单章/全部导出 TXT、Markdown，作品备份 JSON
- **写作统计**：字数、章节进度、大纲进度图表
- **多作品管理**：切换、删除、备份不同作品

## 技术栈

- Next.js 16（App Router, Turbopack）
- TypeScript
- Tailwind CSS
- TipTap 富文本编辑器
- Zustand 状态管理
- IndexedDB（idb）本地存储
- DeepSeek API（SSE 流式响应）
- Lucide React 图标

## 项目结构

```
src/
├── app/              # Next.js App Router
│   └── api/ai/chat/  # AI 聊天 API（SSE）
├── components/
│   ├── editor/       # 编辑器、版本历史
│   ├── chat/         # AI 聊天面板、@提及
│   ├── characters/   # 角色卡
│   ├── outline/      # 大纲、故事线
│   ├── layout/       # 侧边栏、章节面板、面板调整器
│   ├── discussion/   # 灵感讨论室
│   ├── stats/        # 写作统计
│   └── common/       # 通用组件
├── store/            # Zustand 状态管理（7个store）
├── lib/              # 工具函数（AI、DB、导出、角色/大纲提取）
└── types/            # TypeScript 类型定义
```
