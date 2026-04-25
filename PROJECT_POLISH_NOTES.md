# Provincial Polish Notes

## Goal

本轮围绕“基于 AIGC 与自适应调度的英语词汇学习对战小程序”进行参赛展示打磨，重点提升稳定性、中文文案质量、首页学习模式入口、AIGC 闭环叙事和数据看板展示效果。

## Changes

| Area | Change | Business Logic Changed |
| --- | --- | --- |
| 首页数据同步 | `refreshUserInfo()` 同步 store、globalData、storage，首页 `onShow` 重新拉取用户数据 | Yes |
| 词汇学习模式入口 | 新增首页上方 `learningModeSwitch` 卡片，使用 `vocabularyLearningMode` storage | Yes |
| setting 设置页 | 移除“词汇学习模式”和“关于词魂”，保留题量、声音、发音、震动、数据清理、头像昵称更新 | Yes |
| learning 页面 | 继续按配置直接进入 recognition / choice；切换入口改为回首页 | Yes |
| 中文乱码 | 修复 statistics 页面学习、对战、词书、模式等乱码文案 | No |
| 数据看板 | 新增学习成效洞察、对战成效洞察和友好空状态 | No |
| AIGC 页面 | 强化“今日学习建议”和“对战复盘”两个主能力，失败时友好提示 | Yes |
| 文档 | 更新 README、数据同步说明、词汇学习模式说明和本文件 | No |

## Key Field Mapping

- 词力值：`experience`
- 总局数：`totalGames`
- 胜利次数：`winGames`
- 词汇学习模式：`vocabularyLearningMode`
- 模式可选值：`recognition` / `choice`

## Validation

已执行：

- `git diff --check`
- `npm run lint`

当前本地 `npm run lint` 仍无法执行，因为依赖中缺少 `eslint` 可执行文件，输出为 `sh: eslint: command not found`。此前尝试安装依赖时 npm 自身报 `Exit handler never called!`，需要在依赖正常环境中重新运行。

建议在微信开发者工具手动验证：

1. 首页打开正常，词力值、总局数、胜利次数可显示。
2. 词汇学习模式卡片位于首页上方，可切换“认识 / 不认识”和“选项练习”。
3. 重新进入首页后模式选择仍保留。
4. learning 页面不展示完整模式选择卡片，只按首页配置进入对应流程。
5. recognition 模式可查看释义，可直接点认识 / 不认识并进入下一词。
6. choice 模式选项、正误反馈、提示卡和结算保持原逻辑。
7. setting 页面不再出现词汇学习模式和“关于词魂”。
8. statistics 页面无明显乱码，学习 / 对战数据和空状态正常。
9. AIGC 页面能触发“生成今日学习建议”和“生成对战复盘”。

## Rollback

方式一：切回备份分支

```bash
git checkout backup/before-provincial-polish
```

方式二：回滚本轮提交

```bash
git log --oneline
git revert <本轮相关 commit>
```

## Notes

- 未新增 npm 依赖。
- 未更改页面路由路径。
- 未重命名 `pages/learning/learning`。
- 未修改云函数业务逻辑或数据库结构。
- `vocabularyLearningMode` 是兼容旧用户的可选配置，旧用户默认使用 `choice`。
