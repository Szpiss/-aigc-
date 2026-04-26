const app = getApp();

Page({
  data: {
    chatMode: "bot",
    showBotAvatar: true,
    agentConfig: {
      // ============ ↓↓↓ 把这行改成你自己的真实BotId ↓↓↓ ============
      botId: "ibot-yingyuxuexi-fg8vn8",
      allowWebSearch: true,
      allowUploadFile: true,
      allowPullRefresh: true,
      allowUploadImage: true,
      showToolCallDetail: true,
      allowMultiConversation: true,
      allowVoice: true,
      showBotName: true,
      tools: [
        {
          name: "get_learning_plan",
          description: "获取当天学习计划，返回推荐单词列表",
          parameters: {
            type: "object",
            properties: { date: { type: "string" }, bookId: { type: "string" } },
            required: ["date"],
          },
          handler: async (params) => {
            const { date, bookId } = params;
            const res = await wx.cloud.callFunction({
              name: "server",
              data: {
                url: "learningData/getLearningPlan",
                date,
                bookId,
              },
            });
            return res.result;
          },
        },
        {
          name: "get_weak_words",
          description: "获取掌握度最低的弱词列表",
          parameters: {
            type: "object",
            properties: { limit: { type: "number" }, bookId: { type: "string" } },
            required: [],
          },
          handler: async (params) => {
            const { limit, bookId } = params || {};
            const res = await wx.cloud.callFunction({
              name: "server",
              data: {
                url: "learningData/getWordMasteryTop",
                limit: limit || 8,
                bookId,
              },
            });
            return res.result;
          },
        },
        {
          name: "get_learning_report",
          description: "获取学习报告摘要",
          parameters: {
            type: "object",
            properties: { type: { type: "string" }, date: { type: "string" } },
            required: ["type", "date"],
          },
          handler: async (params) => {
            const { type, date } = params;
            const res = await wx.cloud.callFunction({
              name: "server",
              data: {
                url: "learningData/getLearningReport",
                type,
                date,
              },
            });
            return res.result;
          },
        },
      ],
    },
    envShareConfig: {},
    modelConfig: {
      modelProvider: "deepseek",
      quickResponseModel: "deepseek-v3.2",
      logo: "",
      welcomeMsg: "欢迎来到词魂 AI 学习助手。我会结合词汇学习、弱词和对战记录，帮你分析学习状态、复盘对战表现，并给出下一步训练建议。",
    },
    activeScene: "learning",
    contextLoading: false,
    contextError: "",
    summaryCards: [
      { label: "今日学习", value: "0 词", desc: "完成词汇学习后更新" },
      { label: "学习正确率", value: "待积累", desc: "根据近 7 天学习记录" },
      { label: "对战胜率", value: "待积累", desc: "根据最近对战记录" },
      { label: "薄弱词", value: "0 个", desc: "由学习和对战错词沉淀" },
    ],
    quickPrompts: [
      { label: "我今天学得怎么样？", type: "learning", prompt: "请结合我的学习记录，用简洁的方式分析我今天学得怎么样，并给出下一步建议。" },
      { label: "帮我复盘最近一次对战", type: "battle", prompt: "请结合最近一次对战记录，帮我复盘得分、错误原因和下一局策略。" },
      { label: "我该重点练哪些词？", type: "learning", prompt: "请结合弱词榜和学习计划，告诉我接下来应该重点练哪些词，并说明原因。" },
    ],
    learningInsight: {
      problem: "学习数据正在同步",
      reason: "Agent 会读取学习计划、弱词榜和近 7 天报告。",
      action: "同步完成后可生成今日学习建议。",
    },
    battleInsight: {
      result: "待同步",
      accuracy: "待同步",
      mistake: "暂无对战样本",
      summary: "完成一局单词对战后，Agent 会生成复盘建议。",
    },
    weakWordsPreview: [],
    nextActions: ["完成一轮词汇学习，建立今日学习样本", "进行一局单词对战，沉淀竞技表现", "回到 Agent 页面生成学习建议或对战复盘"],
  },

  onBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: "/pages/home/home",
        });
      },
    });
  },

  async onGenerateLearningAdvice() {
    this.setData({ activeScene: "learning" });
    wx.showLoading({ title: "生成中" });
    try {
      const payload = await this.buildContextPayload();
      const prompt = `你是“词魂”英语词汇学习对战小程序的 AIGC 学习教练。请基于以下学习计划、弱词和学习报告生成“今日学习建议”。要求：1) 先总结当前薄弱点；2) 给出3条具体复习策略；3) 列出3个重点词并解释记忆法；4) 最后给出一个10分钟执行计划。\n\n${payload}`;
      this.sendToAgent(prompt);
    } catch (error) {
      wx.showToast({ title: "学习建议生成失败", icon: "none", duration: 1500 });
    } finally {
      wx.hideLoading();
    }
  },

  async onGenerateCombatReview() {
    this.setData({ activeScene: "battle" });
    wx.showLoading({ title: "复盘中" });
    try {
      const payload = await this.buildContextPayload(true);
      const prompt = `你是“词魂”英语词汇学习对战小程序的 AIGC 对战复盘教练。请基于以下学习、弱词和最近对战数据生成“对战复盘”。要求：1) 给出胜率和得分结论；2) 解释主要失误类型；3) 关联弱词给出训练重点；4) 给出下一局可执行的对战策略。\n\n${payload}`;
      this.sendToAgent(prompt);
    } catch (error) {
      wx.showToast({ title: "对战复盘生成失败", icon: "none", duration: 1500 });
    } finally {
      wx.hideLoading();
    }
  },

  async buildContextPayload(includeCombat = false) {
    const bookId = app?.store?.$state?.book?._id || "";
    const date = new Date().toISOString();

    const [planRes, weakRes, reportRes, combatRes] = await Promise.all([
      this.safeServerCall({ url: "learningData/getLearningPlan", date, bookId }),
      this.safeServerCall({ url: "learningData/getWordMasteryTop", limit: 8, bookId }),
      this.safeServerCall({ url: "learningData/getLearningReport", type: "week", date }),
      includeCombat ? this.getCombatSummary() : Promise.resolve(null),
    ]);

    const plan = planRes?.data || null;
    const weakRaw = weakRes?.data || [];
    const summary = reportRes?.data?.summary || {};

    const planWords = plan?.words || [];
    const planIds = planWords.map((id) => String(id));
    const weakIds = weakRaw.map((item) => item.wordId ? String(item.wordId) : "").filter(Boolean);
    const missingWeakIds = weakRaw.filter((item) => !item.word && item.wordId).map((item) => String(item.wordId));

    const wordMap = await this.fetchWordMap([...new Set([...planIds, ...missingWeakIds])]);
    const planText = planWords.length > 0
      ? planWords.slice(0, 12).map((id) => wordMap[String(id)] || String(id)).join(", ")
      : "无";

    const weakWords = weakRaw.map((item) => {
      const wordName = item.word || wordMap[String(item.wordId)] || String(item.wordId || "");
      return `${wordName}(${Math.round((item.masteryScore || 0) * 100)}%)`;
    });

    const combatText = combatRes ? `对战：场次${combatRes.total}，胜率${combatRes.winRate}%，均分${combatRes.avgScore}` : "无";
    const hasLearningSignal = planWords.length > 0 || weakWords.length > 0 || (summary.learningCount || 0) > 0;

    return [
      `数据状态: ${hasLearningSignal ? "已有学习数据" : "暂无充分学习数据，请给出适合新用户的启动建议"}`,
      `单词书: ${bookId || "未选择"}`,
      `学习计划词汇(前12): ${planText}`,
      `弱词榜: ${weakWords.join(", ") || "无"}`,
      `学习汇总: 学习次数${summary.learningCount || 0}，学习时长${Math.round((summary.totalStudyTime || 0) / 60)}分钟，正确率${Math.round((summary.correctRate || 0) * 100)}%`,
      combatText,
    ].join("\n");
  },

  async refreshAgentContext() {
    this.setData({ contextLoading: true, contextError: "" });
    try {
      const snapshot = await this.buildAgentSnapshot();
      this.setData({
        ...snapshot,
        contextLoading: false,
      });
    } catch (error) {
      this.setData({
        contextLoading: false,
        contextError: "学习与对战数据暂时同步失败，仍可继续和 Agent 对话。",
      });
    }
  },

  async buildAgentSnapshot() {
    const bookId = app?.store?.$state?.book?._id || "";
    const date = new Date().toISOString();
    const [planRes, weakRes, reportRes, combatRes] = await Promise.all([
      this.safeServerCall({ url: "learningData/getLearningPlan", date, bookId }),
      this.safeServerCall({ url: "learningData/getWordMasteryTop", limit: 6, bookId }),
      this.safeServerCall({ url: "learningData/getLearningReport", type: "week", date }),
      this.getCombatSummary(),
    ]);

    const plan = planRes?.data || null;
    const weakRaw = weakRes?.data || [];
    const report = reportRes?.data || {};
    const summary = report.summary || {};
    const daily = Array.isArray(report.daily) ? report.daily : [];
    const today = this.findTodayDaily(daily);
    const todayWords = today?.totalWordsCount || 0;
    const totalAnswer = (summary.correctCount || 0) + (summary.wrongCount || 0);
    const correctRate = totalAnswer > 0
      ? Math.round(((summary.correctCount || 0) / totalAnswer) * 100)
      : Math.round((summary.correctRate || 0) * 100);
    const weakIds = weakRaw.filter((item) => !item.word && item.wordId).map((item) => String(item.wordId));
    const wordMap = await this.fetchWordMap(weakIds);
    const weakWordsPreview = weakRaw.slice(0, 6).map((item) => ({
      word: item.word || wordMap[String(item.wordId)] || String(item.wordId || "未知词"),
      mastery: Math.round((item.masteryScore || 0) * 100),
    }));
    const planCount = Array.isArray(plan?.words) ? plan.words.length : 0;
    const hasLearning = planCount > 0 || (summary.learningCount || 0) > 0 || todayWords > 0;
    const hasCombat = combatRes && combatRes.total > 0;

    return {
      summaryCards: [
        {
          label: "今日学习",
          value: `${todayWords || planCount || 0} 词`,
          desc: todayWords > 0 ? "来自今日学习记录" : "计划词数 / 待开始",
        },
        {
          label: "学习正确率",
          value: correctRate > 0 ? `${correctRate}%` : "待积累",
          desc: "近 7 天词汇学习表现",
        },
        {
          label: "对战胜率",
          value: hasCombat ? `${combatRes.winRate}%` : "待积累",
          desc: hasCombat ? `最近 ${combatRes.total} 场对战` : "完成对战后生成",
        },
        {
          label: "薄弱词",
          value: `${weakWordsPreview.length} 个`,
          desc: weakWordsPreview.length ? "优先纳入下一步训练" : "暂无明显薄弱词",
        },
      ],
      learningInsight: {
        problem: hasLearning ? this.getLearningProblem(correctRate, weakWordsPreview.length) : "还缺少足够的词汇学习样本",
        reason: hasLearning
          ? `当前结合了学习计划、近 7 天正确率和 ${weakWordsPreview.length} 个薄弱词。`
          : "Agent 需要至少一轮词汇学习记录，才能给出更贴合你的建议。",
        action: hasLearning
          ? "优先完成计划词，随后用弱词训练巩固低掌握度词汇。"
          : "先完成一轮词汇学习，再回来生成今日学习建议。",
      },
      battleInsight: {
        result: hasCombat ? `${combatRes.latestResult} · ${combatRes.latestScore}` : "暂无对战",
        accuracy: hasCombat ? `${combatRes.latestCorrect} 对 / ${combatRes.latestWrong} 错` : "待积累",
        mistake: hasCombat
          ? (combatRes.latestWrong > 0 ? "主要关注错选词义、反应时间和提示依赖。" : "最近一局表现稳定，可提高速度要求。")
          : "尚未形成对战失误样本。",
        summary: hasCombat
          ? `近 ${combatRes.total} 场胜率 ${combatRes.winRate}%，平均 ${combatRes.avgScore} 分。建议把错词回流到词汇学习。`
          : "完成一局单词对战后，这里会出现复盘摘要和再练建议。",
      },
      weakWordsPreview,
      nextActions: this.buildNextActions({ hasLearning, hasCombat, weakCount: weakWordsPreview.length, correctRate }),
    };
  },

  async safeServerCall(data) {
    try {
      const res = await wx.cloud.callFunction({
        name: "server",
        data,
      });
      return res?.result || { state: -1, data: null };
    } catch (error) {
      return { state: -1, data: null };
    }
  },

  async fetchWordMap(ids) {
    const cleanIds = (ids || []).filter(Boolean);
    if (cleanIds.length === 0) {
      return {};
    }
    try {
      const db = wx.cloud.database();
      const command = db.command;
      const res = await db.collection("word")
        .where({ _id: command.in(cleanIds) })
        .get();
      const map = {};
      (res.data || []).forEach((item) => {
        map[String(item._id)] = item.word || String(item._id);
      });
      return map;
    } catch (error) {
      return {};
    }
  },

  async getCombatSummary() {
    try {
      const db = wx.cloud.database();
      const openid = app?.store?.$state?.user?._openid;
      let query = db.collection("combatRecord");
      if (openid) {
        query = query.where({ _openid: openid });
      }
      const res = await query.orderBy("_createTime", "desc").limit(10).get();
      const list = res.data || [];
      const total = list.length;
      const win = list.filter((item) => item.isWin).length;
      const avgScore = total ? Math.round(list.reduce((sum, item) => sum + (item.score || 0), 0) / total) : 0;
      const winRate = total ? Math.round((win / total) * 100) : 0;
      const latest = list[0] || {};
      return {
        total,
        win,
        winRate,
        avgScore,
        latestResult: latest.isWin ? "胜利" : "惜败",
        latestScore: `${latest.score || 0}:${latest.opponentScore || 0}`,
        latestCorrect: latest.correctCount || 0,
        latestWrong: latest.wrongCount || 0,
      };
    } catch (error) {
      return null;
    }
  },

  findTodayDaily(daily) {
    const now = new Date();
    return (daily || []).find((item) => {
      if (!item.date) return false;
      const date = new Date(item.date);
      return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
    }) || null;
  },

  getLearningProblem(correctRate, weakCount) {
    if (weakCount > 0 && correctRate > 0 && correctRate < 70) {
      return "词义辨析和薄弱词巩固需要优先处理";
    }
    if (weakCount > 0) {
      return "已有薄弱词沉淀，适合做针对性复习";
    }
    if (correctRate >= 85) {
      return "基础正确率较好，可以提高训练强度";
    }
    return "需要继续积累学习样本并稳定正确率";
  },

  buildNextActions({ hasLearning, hasCombat, weakCount, correctRate }) {
    if (!hasLearning && !hasCombat) {
      return ["先完成 1 轮词汇学习，建立学习样本", "再进行 1 局单词对战，收集竞技反馈", "回到 Agent 页面生成学习建议和对战复盘"];
    }
    const actions = [];
    if (weakCount > 0) {
      actions.push("进入生词本或词汇学习，优先复习薄弱词");
    }
    if (correctRate > 0 && correctRate < 75) {
      actions.push("用选项练习模式巩固词义辨析，目标正确率提升到 80%");
    } else {
      actions.push("保持当前学习节奏，增加对战检验频率");
    }
    if (hasCombat) {
      actions.push("生成最近一场对战复盘，把错词回流到下一轮训练");
    } else {
      actions.push("完成一局单词对战，让 Agent 获取复盘样本");
    }
    return actions.slice(0, 3);
  },

  sendToAgent(message) {
    const agent = this.selectComponent("#agent-ui");
    if (!agent || typeof agent.handleSendMessage !== "function") {
      wx.showToast({ title: "助手未就绪", icon: "none", duration: 1200 });
      return;
    }
    agent.handleSendMessage({ currentTarget: { dataset: { message } } });
  },

  async onPromptTap(event) {
    const prompt = event.currentTarget.dataset.prompt;
    const type = event.currentTarget.dataset.type;
    if (!prompt) return;
    wx.showLoading({ title: "整理数据" });
    try {
      const payload = await this.buildContextPayload(type === "battle");
      this.sendToAgent(`${prompt}\n\n以下是当前上下文数据：\n${payload}`);
      if (type === "battle") {
        this.setData({ activeScene: "battle" });
      } else {
        this.setData({ activeScene: "learning" });
      }
    } catch (error) {
      wx.showToast({ title: "数据整理失败", icon: "none", duration: 1200 });
    } finally {
      wx.hideLoading();
    }
  },

  onSwitchScene(event) {
    const scene = event.detail?.scene || event.currentTarget?.dataset?.scene;
    if (!scene) return;
    this.setData({ activeScene: scene });
  },

  onStartWeakTraining() {
    wx.navigateTo({ url: "/pages/review/review" });
  },

  onLoad(options) {
    if (options?.scene === "battle") {
      this.setData({ activeScene: "battle" });
    }
    void this.refreshAgentContext();
  },
  onReady() {},
  onShow() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {},
  onReachBottom() {},
  onShareAppMessage() {},
});
