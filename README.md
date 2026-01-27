# 词魂：英语学习与对战小程序（含 AIGC/Agent）

该项目基于「微信小程序」原生框架与「微信小程序云开发」实现词汇学习与对战类小程序，包含：单词对战（随机/好友/人机）、每日词汇、生词本、排行榜、设置、数据看板，以及 AIGC 学习助手。系统具备完整的数据采集、统计分析与自适应学习闭环。


## 项目亮点

- **学习与对战数据闭环**：学习记录、对战记录、日统计与数据看板完整贯通。
- **CDS 自适应调度**：对战错词驱动掌握度计算（wordMastery），自动生成学习计划（learningPlan）。
- **ADAL Agent 融合**：Agent 读取计划/弱词/学习报告，生成学习建议与对战复盘，实现可解释学习闭环。
- **可视化数据看板**：学习趋势、对战统计、弱词榜一页呈现。


## 功能概览

### 1）首页
首页由 **用户信息、提示卡与单词书、核心入口区、底部功能区** 组成：
- 用户信息：展示头像、昵称、词力值、对战统计。
- 工具栏：提示卡数量、单词书选择。
- 核心入口：
  - **单词对战**（进入对战模式选择页）
  - **AIGC 英语学习助手**
  - **数据看板**
  - **每日词汇 / 生词本**（快捷入口）
- 底部区：排行榜、建议反馈等。

### 2）单词对战模块
通过“单词对战”入口进入对战模式选择页：
- **随机匹配**：自动匹配同词书玩家。
- **好友对战**：创建房间邀请好友加入。
- **人机对战**：独立入口，直接与 AI 对战。

对战逻辑要点：
- 每题倒计时 10 秒，正确得分随反应时长递减。
- 提示卡可用于答题，错词自动入生词本。
- 对战结束后写入 combatRecord，并更新 learningData 与 wordMastery。

### 3）每日词汇
- 单词答题模式（选释义）。
- 生命值机制（答错扣血、可复活）。
- 结束后记录 learningRecord 与 learningData。
- **接入学习计划**：优先从 learningPlan 拉取学习词表。

### 4）数据看板
- 学习汇总：学习时长/词数/正确率/次数
- 学习趋势：近 7 天柱状图
- 对战汇总：胜率/均分/场次
- 弱词榜：掌握度最低词汇

### 5）AIGC 学习助手（Agent）
- 结合学习计划 + 弱词榜 + 学习报告 + 对战摘要
- 一键生成“学习建议 / 对战复盘”

### 6）单词发音
- 支持通过发音接口播放单词音频。
- 发音接口可在 `config.pronunciation.baseUrl` 中配置。


## 数据模型（核心集合）

- `combatRecord`：对战记录
- `learningRecord`：学习记录
- `learningData`：日统计
- `wordMastery`：掌握度
- `learningPlan`：学习计划


## 技术栈

- 前端：微信小程序原生框架（WXML/WXSS/JS/TS）
- 云函数：CloudBase
- 云数据库：CloudBase DB
- 状态管理：wxMiniStore
- 路由：wxapp-router
- 事件管理：mitt
- AIGC：腾讯云开发 AI 模块 + agent-ui 组件


## 关键业务流程（简述）

### 对战数据流程
1. 对战结束 -> 写入 `combatRecord`
2. 同步更新 `learningData` 日统计
3. 错词进入 `wordMastery`，更新掌握度

### 学习数据流程
1. 学习结束 -> 写入 `learningRecord`
2. 同步更新 `learningData`

### 自适应学习流程（CDS）
1. 读取 `wordMastery`（弱词优先）
2. 生成 `learningPlan`
3. 学习页优先加载计划词表

### Agent 融合流程（ADAL）
1. 拉取计划/弱词/学习报告/对战摘要
2. 生成可解释建议或复盘


## 配置与部署说明

### 数据库集合必须存在
- `combatRecord` / `learningRecord` / `learningData`
- `wordMastery` / `learningPlan`

### 发音接口配置
在 `miniprogram/utils/config.ts` 中配置发音接口：
```ts
pronunciation: {
  baseUrl: 'https://dict.youdao.com/dictvoice?type=0&audio='
}
```
并在小程序后台添加合法域名：`dict.youdao.com`

### 云函数部署
- 云函数路径：`cloudfunctions/server`
- 每次更新后需重新部署


## 目录结构（简化）

```
miniprogram/
  pages/
    home/            # 首页
    combat/          # 对战页面
    combatSelect/    # 对战模式选择页
    learning/        # 每日词汇
    review/          # 生词本
    ranking/         # 排行榜
    statistics/      # 数据看板
    aigc/            # AIGC 学习助手
cloudfunctions/
  server/
    controller/
    model/
```


## 后续可扩展方向
- 学习计划 A/B 实验
- 掌握度趋势图/分布图
- Agent 复盘结果写回数据库
- 对话内容纳入掌握度更新

---

如需更详细的架构与接口说明，请查看《项目技术与架构文档.md》。
