# ADAL 与 CDS 机制答辩测试文档

## 1. 测试目的

本测试文档用于答辩前专项验证项目中的两个核心机制是否真实运行，并准备可展示证据。

| 机制 | 全称 / 含义 | 本项目中的落点 | 展示目标 |
| --- | --- | --- | --- |
| ADAL | Assess 评估、Diagnose 诊断、Adapt 调度、Learn 反馈 | 学习助手根据学习计划、弱词榜、学习周报、对战摘要生成学习建议或对战复盘 | 证明学习助手不是普通聊天入口，而是读取学习数据后输出结构化反馈 |
| CDS | Combat-Driven Adaptive Scheduler，对战驱动的自适应词汇调度 | `wordMastery` 掌握度更新 + `learningPlan` 个性化学习计划生成 | 证明学习 / 对战结果会沉淀为弱词数据，并影响后续学习计划 |

答辩展示建议重点：

- 不强调“复杂算法原创”，重点强调“学习、对战、数据沉淀、自适应调度、学习助手反馈”的闭环落地。
- 反应时间字段已预留并参与掌握度公式，但当前演示重点放在错词、正确率、提示使用、弱词回流。
- 展示时用真实云数据库记录、页面弱词榜、学习计划和学习助手输出作为证据。

## 2. 需要准备的环境

| 编号 | 准备项 | 操作 | 预期结果 |
| --- | --- | --- | --- |
| PRE-01 | 微信开发者工具 | 打开项目根目录 | 小程序能正常编译启动 |
| PRE-02 | 云函数 | 确认 `cloudfunctions/server` 已上传并部署 | `learningData/*` 接口可调用 |
| PRE-03 | 测试账号 | 使用一个专门演示账号 | 避免污染正式演示数据 |
| PRE-04 | 词库数据 | 检查 `word` 集合 | 至少有 20 个以上单词 |
| PRE-05 | 云数据库控制台 | 打开 `wordMastery`、`learningPlan`、`learningRecord`、`learningData`、`combatRecord` 集合 | 可以查看新增记录 |
| PRE-06 | 控制台日志 | 打开微信开发者工具 Console | 能看到前端和云函数调用日志 |

## 3. CDS 机制测试

### 3.1 CDS 运行链路

CDS 的核心链路是：

1. 用户完成词汇学习或单词对战。
2. 前端调用 `learningData/recordLearning` 或 `learningData/recordCombat`。
3. 云函数更新 `learningRecord`、`learningData`，并同步更新 `wordMastery`。
4. `generateLearningPlan` 读取 `wordMastery`，按掌握度从低到高选择弱词。
5. 系统生成 `learningPlan`，后续学习页面优先读取计划词表。

对应代码位置：

| 环节 | 文件 |
| --- | --- |
| 学习数据上报 | `miniprogram/utils/learningDataRecorder.ts` |
| 学习页读取 / 生成计划 | `miniprogram/pages/learning/learning.ts` |
| 掌握度计算与计划生成 | `cloudfunctions/server/controller/learningData.js` |
| 掌握度集合 | `cloudfunctions/server/model/wordMastery.js` |
| 学习计划集合 | `cloudfunctions/server/model/learningPlan.js` |

### 3.2 测试用例 CDS-01：学习错词写入掌握度

| 项目 | 内容 |
| --- | --- |
| 目的 | 验证完成词汇学习后，系统会更新 `wordMastery` |
| 前置条件 | 使用测试账号，确认已登录；词库中有可学习单词 |
| 操作步骤 | 1. 打开首页；2. 进入“词汇学习”；3. 选择 5 词或 25 词；4. 故意答错 2-3 个词；5. 完成本轮学习；6. 打开云数据库 `wordMastery` 集合 |
| 预期页面表现 | 学习可以正常结算；错词有提示或进入复习 / 生词逻辑 |
| 预期日志 | Console 出现 `recordLearningData 被调用`、`学习数据记录成功`、`recordLearning 掌握度更新` |
| 预期数据库 | `wordMastery` 出现当前用户的记录；错词的 `wrongCount` 增加，`totalCount` 增加，`masteryScore` 低于完全正确词 |
| 答辩展示证据 | 截图 1：学习结算页；截图 2：`wordMastery` 中错词记录 |

重点观察字段：

| 字段 | 含义 | 展示说明 |
| --- | --- | --- |
| `wordId` | 单词 ID | 说明该词被纳入掌握度追踪 |
| `wrongCount` | 错误次数 | 答错后增加 |
| `totalCount` | 出现 / 练习次数 | 每次练习该词后增加 |
| `tipCount` | 提示次数 | 使用提示时可累计 |
| `avgResponseTime` | 平均响应时间 | 当前可作为扩展字段说明 |
| `masteryScore` | 掌握度分数 | 分数越低，越容易进入弱词和学习计划 |

### 3.3 测试用例 CDS-02：对战错词写入掌握度

| 项目 | 内容 |
| --- | --- |
| 目的 | 验证单词对战的错词也会进入 CDS 掌握度体系 |
| 前置条件 | 测试账号可以进入对战；建议使用人机对战，方便稳定演示 |
| 操作步骤 | 1. 首页进入“单词对战”；2. 选择“人机对战”；3. 故意答错 2-3 个词；4. 完成对战并进入结算；5. 查看 `combatRecord` 与 `wordMastery` |
| 预期页面表现 | 对战正常结算，显示胜负、得分、正确数、错误数 |
| 预期日志 | Console 出现 `recordCombatData 被调用`、`对战数据记录成功` |
| 预期数据库 | `combatRecord` 新增本局记录；`wordMastery` 中对应错词的 `wrongCount` 和 `totalCount` 更新 |
| 答辩展示证据 | 截图 1：对战结算页；截图 2：`combatRecord`；截图 3：`wordMastery` |

### 3.4 测试用例 CDS-03：低掌握度词进入学习计划

| 项目 | 内容 |
| --- | --- |
| 目的 | 验证 `generateLearningPlan` 会读取低掌握度词并生成个性化计划 |
| 前置条件 | 已通过 CDS-01 或 CDS-02 产生若干低掌握度词 |
| 操作步骤 | 1. 回到首页；2. 再次进入“词汇学习”或学习助手中的词汇学习模块；3. 触发学习计划生成；4. 打开云数据库 `learningPlan` 集合；5. 对照 `source.weak` 和 `wordMastery` |
| 预期页面表现 | 学习页能加载词表，词库不足时会提示实际可用词数 |
| 预期数据库 | `learningPlan` 新增或更新当天计划；`source.weak` 中包含低掌握度词；`source.reinforce` 和 `source.new` 用于巩固词与新词补充 |
| 答辩展示证据 | 截图 1：`wordMastery` 按 `masteryScore` 低分排序；截图 2：`learningPlan.source.weak`；截图 3：学习页正在使用计划词 |

`learningPlan` 重点字段：

| 字段 | 含义 | 展示说明 |
| --- | --- | --- |
| `words` | 本轮计划词 ID 列表 | 后续学习优先使用这些词 |
| `total` | 计划词数量 | 应接近请求词数 |
| `source.weak` | 弱词来源 | 证明低掌握度词被优先调度 |
| `source.reinforce` | 巩固词来源 | 证明不是单纯随机选词 |
| `source.new` | 新词补充 | 当弱词不足时补齐计划 |

### 3.5 CDS 答辩讲解话术

可以这样讲：

> CDS 不是简单随机抽词。用户在学习或对战中的错误会写入 `wordMastery`，系统根据错误次数、练习次数、提示使用和响应时间计算掌握度分数。生成下一轮学习计划时，系统优先选择掌握度低的词，再加入巩固词和新词，形成“暴露问题 -> 更新掌握度 -> 调度复习”的闭环。

## 4. ADAL 机制测试

### 4.1 ADAL 运行链路

ADAL 在学习助手页面中运行，核心链路是：

1. 用户点击“学习建议”或“对战复盘”。
2. 页面调用 `buildContextPayload` 组装上下文。
3. 上下文读取：
   - `learningData/getLearningPlan`
   - `learningData/getWordMasteryTop`
   - `learningData/getLearningReport`
   - 对战复盘时额外读取对战摘要
4. 学习助手根据 ADAL 结构生成建议：
   - Assess：学习状态评估
   - Diagnose：薄弱点诊断
   - Adapt：自适应训练安排
   - Learn：下一步反馈闭环

对应代码位置：

| 环节 | 文件 |
| --- | --- |
| 学习建议生成 | `miniprogram/pages/aigc/aigc.js` 的 `onGenerateLearningAdvice` |
| 对战复盘生成 | `miniprogram/pages/aigc/aigc.js` 的 `onGenerateCombatReview` |
| 数据上下文拼接 | `miniprogram/pages/aigc/aigc.js` 的 `buildContextPayload` |
| 学习计划接口 | `learningData/getLearningPlan` |
| 弱词榜接口 | `learningData/getWordMasteryTop` |
| 周学习报告接口 | `learningData/getLearningReport` |

### 4.2 测试用例 ADAL-01：学习建议读取计划和弱词

| 项目 | 内容 |
| --- | --- |
| 目的 | 验证学习助手会读取学习计划、弱词榜、学习报告，并生成 ADAL 结构化建议 |
| 前置条件 | 已通过 CDS 测试产生 `wordMastery` 和 `learningPlan` 数据 |
| 操作步骤 | 1. 首页进入“学习助手”；2. 进入“学习建议”模块；3. 点击生成学习建议；4. 等待输出；5. 对照 Console 和云数据库 |
| 预期页面表现 | 输出包含学习状态评估、薄弱点诊断、自适应训练安排、下一步反馈闭环等内容 |
| 预期数据来源 | 输出内容能提到计划词、弱词、正确率或学习次数等数据 |
| 预期接口调用 | `getLearningPlan`、`getWordMasteryTop`、`getLearningReport` 被调用 |
| 答辩展示证据 | 截图 1：学习助手输出；截图 2：`learningPlan`；截图 3：`wordMastery` 弱词 |

判断通过标准：

- 不是只输出泛泛建议。
- 能结合弱词或学习记录。
- 能体现评估、诊断、调度、反馈四段逻辑。

### 4.3 测试用例 ADAL-02：对战复盘读取对战摘要

| 项目 | 内容 |
| --- | --- |
| 目的 | 验证对战复盘会结合对战数据进行反馈 |
| 前置条件 | 已完成人机对战或好友对战，并产生 `combatRecord` |
| 操作步骤 | 1. 首页进入“学习助手”；2. 进入“对战复盘”模块；3. 点击生成对战复盘；4. 等待输出；5. 对照 `combatRecord` |
| 预期页面表现 | 输出包含对战表现评估、失误原因诊断、弱词回流训练、下一局策略建议 |
| 预期数据来源 | 输出能结合场次、胜率、均分或最近对战表现 |
| 答辩展示证据 | 截图 1：对战结算页；截图 2：`combatRecord`；截图 3：学习助手对战复盘输出 |

### 4.4 ADAL 答辩讲解话术

可以这样讲：

> ADAL 是学习助手的反馈框架。它不是独立聊天，而是先读取学习计划、弱词榜、周学习报告和对战摘要，再按“评估、诊断、调度、反馈”组织建议。这样学习助手就和 CDS 产生的数据连接起来，把系统沉淀的数据转化成用户能理解的下一步训练安排。

## 5. 推荐答辩演示流程

建议总时长控制在 6-8 分钟。

| 步骤 | 页面 / 工具 | 操作 | 讲解重点 | 预计时间 |
| --- | --- | --- | --- | --- |
| 1 | 首页 | 展示首页入口和用户数据 | 系统包含学习、对战、数据看板、学习助手 | 30 秒 |
| 2 | 词汇学习 | 故意答错几个词并结算 | 学习结果会沉淀数据 | 1 分钟 |
| 3 | 云数据库 | 打开 `wordMastery` | 错词更新掌握度，出现低分弱词 | 1 分钟 |
| 4 | 学习计划 | 重新进入学习或触发计划生成，查看 `learningPlan` | 低掌握度词进入 `source.weak` | 1 分钟 |
| 5 | 人机对战 | 完成一局或展示已有对战记录 | 对战也能暴露弱词 | 1 分钟 |
| 6 | 学习助手 | 生成学习建议 / 对战复盘 | ADAL 读取计划、弱词、统计后输出反馈 | 1.5 分钟 |
| 7 | 数据看板 | 展示弱词榜和统计 | 证明闭环结果在前端可见 | 1 分钟 |

## 6. 展示证据清单

答辩前建议准备以下截图或现场页面：

| 证据编号 | 内容 | 说明 |
| --- | --- | --- |
| EVD-01 | 学习结算页 | 证明完成了一轮学习 |
| EVD-02 | 对战结算页 | 证明完成了一轮对战 |
| EVD-03 | `wordMastery` 集合记录 | 证明错词和掌握度被记录 |
| EVD-04 | `learningPlan` 集合记录 | 证明系统生成了自适应计划 |
| EVD-05 | `learningPlan.source.weak` 与低分 `wordMastery` 对照 | 证明弱词进入计划 |
| EVD-06 | 数据看板弱词榜 | 证明掌握度结果前端可见 |
| EVD-07 | 学习助手学习建议输出 | 证明 ADAL 反馈运行 |
| EVD-08 | 学习助手对战复盘输出 | 证明对战数据进入反馈链路 |

## 7. 常见问题与答辩回答

| 问题 | 建议回答 |
| --- | --- |
| CDS 是什么，不就是错题本吗？ | 不是单纯错题本。错词会进入 `wordMastery`，系统会持续统计错误次数、练习次数、提示使用和响应时间字段，并据此生成下一轮 `learningPlan`。 |
| 学习计划是不是随机生成？ | 不是完全随机。计划优先读取低掌握度词作为 `source.weak`，再加入巩固词和新词补齐，避免用户只练随机词。 |
| ADAL 是否真的读取了数据？ | 是。学习助手生成建议前会读取学习计划、弱词榜、学习周报；对战复盘还会读取对战摘要。可以现场展示数据库记录和输出内容对应关系。 |
| 反应时间是否已经完整使用？ | 字段和评分公式已预留并接入，当前演示重点是错词、正确率、提示使用与弱词回流，后续可以继续强化真实响应时间采集。 |
| 这个闭环有什么价值？ | 用户学习和对战产生的数据不会停留在记录层，而是回流到掌握度、学习计划和学习助手建议中，形成持续调整的学习路径。 |

## 8. 最终验收表

| 编号 | 验收项 | 通过标准 | 结果 |
| --- | --- | --- | --- |
| CHECK-01 | 学习后更新 `wordMastery` | 错词出现或更新，`wrongCount`、`totalCount`、`masteryScore` 合理 | 待测 |
| CHECK-02 | 对战后更新 `combatRecord` | 完成对战后有对战记录 | 待测 |
| CHECK-03 | 对战错词更新 `wordMastery` | 对战错词进入掌握度体系 | 待测 |
| CHECK-04 | 生成 `learningPlan` | 当天有计划记录，`words` 非空 | 待测 |
| CHECK-05 | 弱词进入计划 | `source.weak` 能对应低掌握度词 | 待测 |
| CHECK-06 | 学习建议可生成 | 输出体现评估、诊断、调度、反馈 | 待测 |
| CHECK-07 | 对战复盘可生成 | 输出结合对战摘要和弱词回流 | 待测 |
| CHECK-08 | 数据看板可展示 | 弱词榜或学习 / 对战统计有结果 | 待测 |

最终结论：

- CDS 是否运行：是 / 否
- ADAL 是否运行：是 / 否
- 是否具备答辩现场展示条件：是 / 否
- 需要提前准备的数据或截图：
