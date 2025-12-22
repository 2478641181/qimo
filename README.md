# QA Viewer

这是一个最小的 Next.js 项目，用于展示 `data.json` 中的题目与答案，并提供搜索功能。

快速使用：

- 本地运行:

```bash
npm install
npm run dev
```

- 构建并本地预览：

```bash
npm run build
npm start
```

部署到 Vercel：

1. 将代码推送到 GitHub（或其他 git 仓库）。
2. 在 https://vercel.com/ 中选择 "Import Project"，连接仓库并导入。
3. Vercel 会自动运行 `npm run build` 并部署。

注意：项目会在构建时读取仓库根目录下的 `data.json`。请确保仓库中存在 `data.json`（示例文件已包含在工作区）。
