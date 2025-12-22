# 期末题库中心 (Exam Question Bank)

这是一个基于 Next.js 构建的现代化题库检索系统，专为期末复习打造。支持关键词秒搜、填空题自动填充答案，并完美适配移动端设备。

## ✨ 功能特性

- **⚡ 即时检索**：输入关键词即可实时筛选题目，毫秒级响应。
- **📱 全端适配**：精心设计的响应式布局，在手机、平板和桌面端都有极佳体验。
- **🧩 智能填空**：自动识别填空题占位符，并将答案嵌入题目中显示，便于记忆。
- **🎨 沉浸体验**：现代化的 UI 设计，包含动态背景流光和磨砂玻璃效果。
- **❤️ 支持互动**：内置支持弹窗与悬浮按钮，方便用户进行互动或捐赠。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或者
yarn install
```

### 2. 准备数据

确保项目根目录下存在 `data.json` 文件，格式如下：

```json
{
  "items": [
    {
      "question": "题目内容...",
      "answer": "答案内容...",
      "analysis": "解析..."
    }
  ]
}
```

### 3. 启动开发服务器

```bash
npm run dev
# 或者
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

## 🛠️ 构建与部署

### 构建生产版本

```bash
npm run build
npm start
```

### 部署到 Vercel

本项目针对 Vercel 进行了优化，推荐使用 Vercel 进行部署：

1. 将代码推送到 GitHub。
2. 在 [Vercel](https://vercel.com) 导入项目。
3. 点击部署即可，Vercel 会自动处理构建过程。

## 📂 项目结构

- `pages/` - 页面路由与 API 接口
- `styles/` - 全局样式与 CSS 变量
- `public/` - 静态资源
- `data.json` - 题库数据源

## 📝 许可证

MIT License
