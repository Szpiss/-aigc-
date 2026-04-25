# Vocabulary Learning Modes

## Goal

本次将产品内用户可见的“每日词汇”统一改为“词汇学习”，让功能名称更适合长期使用，而不是只表达每天一次的任务感。

新增两种学习模式：

- `recognition`：认识 / 不认识，适合快速过词、复习和筛出生词。
- `choice`：选项练习，沿用原有选项答题流程，适合通过释义选择巩固记忆。

模式选择放在首页上方的轻量卡片中，避免 learning 页面变成入口选择页，也避免设置页承载高频学习决策。learning 页面只读取当前配置并直接进入对应学习流程。

## User-facing Changes

- 首页入口从“每日词汇”改为“词汇学习”。
- 生词本、提示卡、文档等用户可见描述统一使用“词汇学习”。
- 首页上方新增“词汇学习模式”卡片，可直接切换模式。
- setting 页面不承载词汇学习模式设置。
- learning 页面顶部轻量展示当前模式，并提供“回首页切换”入口。
- learning 页面不会展示完整模式选择卡片。

## Mode Configuration

- 配置入口：`pages/home/home` 上方的“词汇学习模式”卡片。
- 默认模式：`choice`，即“选项练习”。
- 本地 storage key：`vocabularyLearningMode`。
- 可选值：`recognition` / `choice`。
- 读取优先级：本地 storage、云端用户配置 `user.config.vocabularyLearningMode`、默认 `choice`。
- 当前实现以本地 storage 为主；没有新增数据库字段，也没有改云函数保存逻辑。类型层面兼容可选云端字段，后续如果已有 profile 配置同步能力，可以无痛接入。

## Files Changed

| File | Change | Logic Changed |
| --- | --- | --- |
| `miniprogram/utils/vocabularyLearningMode.ts` | 新增学习模式读取、保存、文案映射工具 | Yes |
| `miniprogram/pages/home/components/learningModeSwitch/*` | 新增首页词汇学习模式切换卡片 | Yes |
| `miniprogram/pages/setting/setting.*` | 移除词汇学习模式和关于入口，保持设置页简洁 | Yes |
| `miniprogram/pages/learning/learning.ts` | 进入页面时读取模式并写入 learning state | Yes |
| `miniprogram/pages/learning/learning.wxml` | 顶部展示当前模式和更改入口 | No |
| `miniprogram/pages/learning/learning.wxss` | 新增顶部模式条样式 | No |
| `miniprogram/pages/learning/components/problem/problem.ts` | 新增 recognition 流程，并抽取 `finishLearningSession()` 复用结算 | Yes |
| `miniprogram/pages/learning/components/problem/problem.wxml` | 根据模式展示 recognition 或 choice 界面 | No |
| `miniprogram/pages/learning/components/problem/problem.wxss` | 新增 recognition 卡片和按钮样式 | No |
| `miniprogram/pages/learning/components/topBar/topBar.wxml` | recognition 显示学习进度，choice 保留生命值和倒计时 | No |
| `miniprogram/pages/learning/components/footerBar/footerBar.wxml` | recognition 隐藏提示卡入口 | No |
| `miniprogram/pages/learning/components/popup/popup.ts` | recognition 完成后直接展示“再来一局”，避免分享续命流程 | Yes |
| `miniprogram/utils/state.ts` | learning state 新增 `mode` 字段 | Yes |
| `typings/model.d.ts` | 用户配置类型兼容可选 `vocabularyLearningMode` | No |
| `README.md` / `DATA_SYNC_FIX_NOTES.md` / `项目技术与架构文档.md` | 更新“词汇学习”相关说明 | No |
| `cloudfunctions/server/controller/learningData.js` / `cloudfunctions/server/model/learningRecord.js` | 仅更新注释文案 | No |

## Mode Logic

### Recognition Mode

- 用户先看到英文单词和音标。
- 点击“查看释义”后展示中文释义。
- 点击“认识”：
  - 复用原有正确答题逻辑。
  - `score + 1`，待结算 `experience + 1`。
  - 不加入生词本。
  - 进入下一词。
- 点击“不认识”：
  - 不扣生命值，不作为惩罚。
  - 调用 `userWordModel.add(wordId)` 加入生词本 / 复习。
  - 展示温和提示“已加入复习，之后会重点练这个词”。
  - 进入下一词。
- 本轮 recognition 以当前加载的词表为一轮，完成后调用统一 `finishLearningSession()`。
- 完成后仍会记录学习数据、结算词力值、刷新首页用户数据，因此会计入数据看板的学习统计。

### Choice Mode

- 复用原有选项练习逻辑。
- 题目来源仍是学习计划优先，失败时回退随机词表。
- 选项由目标词正确释义 + 干扰词释义生成。
- 选择正确：
  - `score + 1`。
  - 待结算 `experience + 1`。
  - 进入下一题。
- 选择错误：
  - 加入生词本。
  - 扣减生命值。
  - UI 继续展示原有正确 / 错误反馈。
- 生命值耗尽时调用统一 `finishLearningSession()`，保持原有学习记录、词力值结算、首页刷新和统计链路。

## Data Compatibility

- 旧用户没有 `vocabularyLearningMode` 时默认 `choice`。
- 当前没有新增学习记录字段，旧学习记录完全兼容。
- 数据看板仍按总学习数据统计，不拆分 recognition / choice。
- 未新增数据库结构。
- 未修改云函数业务逻辑。

## Verification

建议手动验证：

1. 首页入口显示“词汇学习”。
2. 首页上方出现“词汇学习模式”。
3. 默认显示“选项练习”。
4. 可以切换到“认识 / 不认识”。
5. 选择结果保存到 `vocabularyLearningMode` storage。
6. 重新进入首页，选择结果仍然存在。
7. 首页点击“词汇学习”后直接进入当前设置模式。
8. learning 页面不显示完整模式选择卡片。
9. recognition 模式单词、查看释义、认识、不认识、下一词正常。
10. choice 模式选项、正确 / 错误反馈、下一题正常。
11. 不认识 / 选错能进入生词或复习逻辑。
12. 学习完成后首页词力值能刷新。
13. 数据看板学习统计正常。
14. `npm run lint` 需要在依赖可用环境中执行；当前本机缺少 `eslint`，npm 安装依赖时也遇到 npm 自身错误。

## Rollback

方式一：切回备份分支

```bash
git checkout backup/before-vocabulary-learning-modes
```

方式二：回滚本次提交

```bash
git log --oneline
git revert <本次相关 commit>
```
