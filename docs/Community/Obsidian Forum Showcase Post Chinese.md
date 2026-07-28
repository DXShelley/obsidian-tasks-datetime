---
publish: false
---

# Obsidian Forum 中文展示帖

## 发布信息

- **分区：** [Share & showcase](https://forum.obsidian.md/c/share-showcase/9)
- **标题：** `Tasks Datetime：当任务只写日期还不够时`
- **可选标签：** `plugin`、`tasks`、`productivity`
- **链接：** [项目仓库](https://github.com/DXShelley/obsidian-tasks-datetime)、[最新版本](https://github.com/DXShelley/obsidian-tasks-datetime/releases/latest)、[问题反馈](https://github.com/DXShelley/obsidian-tasks-datetime/issues)

## 帖子正文

````markdown
大多数任务系统只问一个问题：“这件事哪天到期？”

很多任务确实只需要日期。但“14:30 参加客户会议”“23:00 开始备份”或“08:00 服药”这类任务，一旦只保留到某一天，原本重要的时间信息就消失了。

因此我开发了 **Tasks Datetime**：一个独立维护的 Obsidian 任务管理插件。它让你的任务继续保存在 Markdown 中，同时按需支持精确到秒的日期与时间。

它的边界很明确：

- 只需要日期时，保持熟悉、紧凑的日期任务工作流。
- 只有任务确实需要时分秒时，才开启时间支持。
- 不必把任务迁移到另一个应用，仍可在笔记库中创建、编辑、查询和回顾。

例如：

```text
- [ ] 参加客户会议 📅 2026-07-29 14:30:00
- [ ] 启动夜间备份 ⏳ 2026-07-29 23:00:00
```

插件提供日期与时间合一的选择器、支持时间的任务查询、重复任务预设、四象限优先级编辑，以及今天、本周和本月的任务仪表板。不需要显示时间时，任务仍可以日期形式保持简洁。

如果你在 Obsidian 里安排会议、学习时间块、值班、例行事务或有明确时点的项目工作，它可能适合你。反过来，如果日期任务列表已经足够好用，继续保持简单通常是更好的选择。

**安装：** 从[最新版本](https://github.com/DXShelley/obsidian-tasks-datetime/releases/latest)下载并解压，将 `main.js`、`manifest.json` 和 `styles.css` 复制到库中的 `.obsidian/plugins/tasks-datetime/`，然后在 Obsidian 的社区插件设置中启用 **Tasks Datetime**。

项目采用 MIT 协议、以本地文件为中心，不包含网络请求或遥测。它是 [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) 的独立衍生项目，不是官方项目，也未获上游项目或其维护者认可、关联或支持。

我尤其希望听到有真实按时排程需求的用户的反馈：当“一个日期”不够精确时，你的任务流程在哪一步变得别扭？欢迎回复一个简短场景、想要的查询方式，或在 [GitHub](https://github.com/DXShelley/obsidian-tasks-datetime/issues) 提交问题。
````

## 发布前检查

- 确认最新 Release 仍包含 `main.js`、`manifest.json` 和 `styles.css`。
- 加入一张已在当前构建中人工核对过的日期时间选择器或仪表板截图。
- 在插件被 Obsidian Community Plugins 目录收录前，不要声称可在目录中直接安装。
- 发布后优先回答具体工作流和安装问题；不要编造用户评价或下载数据。
