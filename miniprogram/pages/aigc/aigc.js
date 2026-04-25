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
      welcomeMsg: "欢迎来到词魂 AIGC 学习助手。我会结合词汇学习、弱词和对战记录，生成今日学习建议或对战复盘。",
    },
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
      return { total, winRate, avgScore };
    } catch (error) {
      return null;
    }
  },

  sendToAgent(message) {
    const agent = this.selectComponent("#agent-ui");
    if (!agent || typeof agent.handleSendMessage !== "function") {
      wx.showToast({ title: "助手未就绪", icon: "none", duration: 1200 });
      return;
    }
    agent.handleSendMessage({ currentTarget: { dataset: { message } } });
  },

  onLoad(options) {},
  onReady() {},
  onShow() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {},
  onReachBottom() {},
  onShareAppMessage() {},
});
