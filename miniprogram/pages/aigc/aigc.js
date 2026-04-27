const app = getApp();

const LEARNING_MODE_STORAGE_KEY = "vocabularyLearningMode";
const LEARNING_OPTION_NUMBER = 4;
const LEARNING_HEALTH_POINT = 3;
const LEARNING_COUNTDOWN = 30;

const moduleMap = {
  home: "home",
  learning: "suggestions",
  battle: "battle-review",
  vocabulary: "vocabulary",
  "daily-practice": "daily-practice",
  daily: "daily-practice",
  "vocab-test": "vocab-test",
  test: "vocab-test",
  "battle-review": "battle-review",
  suggestions: "suggestions",
  "weak-words": "vocabulary",
  settings: "home",
};

const moduleTitles = {
  home: "英语学习助手",
  vocabulary: "词汇学习",
  "daily-practice": "日常练习",
  "vocab-test": "词汇检测",
  "battle-review": "对战复盘",
  suggestions: "学习建议",
};

const vocabularyModeOptions = [
  { label: "选项练习", value: "choice", desc: "四选一巩固词义辨析" },
  { label: "认识 / 不认识", value: "recognition", desc: "快速过词，筛出需要复习的词" },
];

Page({
  data: {
    activeModule: "home",
    moduleTitle: "英语学习助手",
    sidebarOpen: false,
    agentLayoutHeight: "100%",
    topBarStyle: "",
    topBarContentStyle: "",
    drawerStyle: "",
    navItems: [
      { key: "home", label: "英语学习助手", icon: "AI" },
      { key: "vocabulary", label: "词汇学习", icon: "词" },
      { key: "battle-review", label: "对战复盘", icon: "战" },
      { key: "suggestions", label: "学习建议", icon: "荐" },
    ],
    workspaceActions: [
      { key: "daily-practice", title: "日常练习", desc: "选择词数和模式，轻量背一轮。", action: "开始学习" },
      { key: "vocab-test", title: "词汇检测", desc: "检查当前掌握情况。", action: "开始检测" },
    ],
    practiceCounts: [25, 50, 100],
    wrongLimitOptions: [3, 5, 10],
    selectedPracticeCount: 25,
    selectedTestWordCount: 25,
    selectedWrongLimit: 3,
    selectedLearningMode: "choice",
    selectedLearningModeLabel: "选项练习",
    selectedLearningModeDesc: "四选一巩固词义辨析",
    vocabularyModeOptions,
    agentLearningStarted: false,
    agentLearningLoading: false,
    agentLearningError: "",
    agentLearningType: "daily",
    agentLearningTitle: "日常练习",
    agentLearningSummary: null,
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
      allowMultiConversation: false,
      allowVoice: true,
      showBotName: false,
      hideQuestions: true,
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
      welcomeMsg: "你好，我是你的英语学习助手。可以问我今天学什么、怎么练词，或让我复盘一次对战。",
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
    wx.reLaunch({ url: "/pages/home/home" });
  },

  initTopBarMetrics() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuRect = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = systemInfo.statusBarHeight || 0;
      const menuTop = menuRect?.top || statusBarHeight + 6;
      const menuHeight = menuRect?.height || 32;
      const menuLeft = menuRect?.left || systemInfo.windowWidth - 96;
      const navGap = Math.max(menuTop - statusBarHeight, 6);
      const navHeight = statusBarHeight + menuHeight + navGap * 2;
      const rightSafe = Math.max(systemInfo.windowWidth - menuLeft + 8, 112);

      this.setData({
        topBarStyle: `height:${navHeight}px;padding-top:${statusBarHeight}px;`,
        topBarContentStyle: `height:${menuHeight}px;padding-right:${rightSafe}px;`,
        drawerStyle: `top:${navHeight + 10}px;bottom:${Math.max(systemInfo.safeArea ? systemInfo.windowHeight - systemInfo.safeArea.bottom : 0, 0) + 14}px;`,
      });
    } catch (error) {
      this.setData({
        topBarStyle: "height:92px;padding-top:44px;",
        topBarContentStyle: "height:36px;padding-right:112px;",
        drawerStyle: "top:102px;bottom:14px;",
      });
    }
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
      this.switchModule("home");
      wx.nextTick(() => {
        const nextAgent = this.selectComponent("#agent-ui");
        if (!nextAgent || typeof nextAgent.handleSendMessage !== "function") {
          wx.showToast({ title: "助手未就绪", icon: "none", duration: 1200 });
          return;
        }
        nextAgent.handleSendMessage({ currentTarget: { dataset: { message } } });
      });
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
    this.switchModule("weak-words");
  },

  onToggleSidebar() {
    this.setData({ sidebarOpen: !this.data.sidebarOpen });
  },

  onCloseSidebar() {
    this.setData({ sidebarOpen: false });
  },

  onNavTap(event) {
    const module = event.currentTarget.dataset.module;
    this.switchModule(module);
  },

  onWorkspaceAction(event) {
    const module = event.currentTarget.dataset.module;
    this.switchModule(module);
  },

  switchModule(module) {
    const activeModule = moduleMap[module] || "home";
    const nextData = {
      activeModule,
      moduleTitle: moduleTitles[activeModule] || "英语学习助手",
      sidebarOpen: false,
    };

    if (["daily-practice", "vocab-test"].includes(activeModule)) {
      nextData.agentLearningStarted = false;
      nextData.agentLearningLoading = false;
      nextData.agentLearningError = "";
      nextData.agentLearningSummary = null;
      nextData.agentLearningType = activeModule === "vocab-test" ? "test" : "daily";
      nextData.agentLearningTitle = activeModule === "vocab-test" ? "词汇检测" : "日常练习";
    }

    if (activeModule === "battle-review") {
      nextData.activeScene = "battle";
    }
    if (["suggestions", "vocabulary", "daily-practice", "vocab-test"].includes(activeModule)) {
      nextData.activeScene = "learning";
    }

    this.setData(nextData);
  },

  onSelectCount(event) {
    const count = Number(event.currentTarget.dataset.count) || 25;
    const target = event.currentTarget.dataset.target === "test" ? "test" : "practice";
    if (target === "test") {
      this.setData({ selectedTestWordCount: count });
      return;
    }
    this.setData({ selectedPracticeCount: count });
  },

  onSelectWrongLimit(event) {
    const limit = Number(event.currentTarget.dataset.limit) || 3;
    this.setData({ selectedWrongLimit: limit });
  },

  onSelectLearningMode(event) {
    const mode = event.currentTarget.dataset.mode === "recognition" ? "recognition" : "choice";
    const option = vocabularyModeOptions.find((item) => item.value === mode) || vocabularyModeOptions[0];
    wx.setStorageSync(LEARNING_MODE_STORAGE_KEY, mode);
    const user = app?.store?.$state?.user;
    if (user?._openid) {
      app.store.setState({
        user: {
          ...user,
          config: {
            ...user.config,
            vocabularyLearningMode: mode,
          },
        },
      });
    }
    this.setData({
      selectedLearningMode: mode,
      selectedLearningModeLabel: option.label,
      selectedLearningModeDesc: option.desc,
    });
  },

  async onStartAgentLearning(event) {
    const type = event.currentTarget.dataset.type === "test" ? "test" : "daily";
    await this.startAgentLearning(type);
  },

  onResetAgentLearning() {
    const type = this.data.agentLearningType || "daily";
    this.setData({ agentLearningStarted: false, agentLearningError: "", agentLearningSummary: null });
    this.switchModule(type === "test" ? "vocab-test" : "daily-practice");
  },

  async startAgentLearning(type = "daily") {
    const mode = this.data.selectedLearningMode === "recognition" ? "recognition" : "choice";
    const targetWordCount = type === "test" ? this.data.selectedTestWordCount : this.data.selectedPracticeCount;
    const selectedWrongLimit = type === "test" ? this.data.selectedWrongLimit : undefined;
    this.setData({
      agentLearningLoading: true,
      agentLearningError: "",
      agentLearningStarted: false,
      agentLearningSummary: null,
      agentLearningType: type,
      agentLearningTitle: type === "test" ? "词汇检测" : "日常练习",
    });

    try {
      if (!app?.store?.$state?.user?.bookId) {
        throw new Error("missing user book");
      }

      wx.setStorageSync(LEARNING_MODE_STORAGE_KEY, mode);
      const wordList = await this.buildAgentLearningQuestions(targetWordCount);
      if (!wordList.length) {
        throw new Error("empty learning words");
      }
      if (wordList.length < targetWordCount) {
        wx.showToast({
          title: `当前可用词汇仅 ${wordList.length} 个，本轮将练习 ${wordList.length} 个`,
          icon: "none",
          duration: 1800,
        });
      }

      await new Promise((resolve) => app.store.setState({
        learning: {
          mode,
          sessionType: type,
          targetWordCount,
          selectedWrongLimit,
          wordsIndex: 0,
          score: 0,
          healthPoint: selectedWrongLimit || LEARNING_HEALTH_POINT,
          wordList,
          countdown: LEARNING_COUNTDOWN,
          experience: 0,
          correctCount: 0,
          wrongCount: 0,
          knownCount: 0,
          unknownCount: 0,
          wrongWords: [],
          unknownWords: [],
        },
      }, resolve));

      app.learningStartTime = new Date();
      this.setData({
        agentLearningStarted: true,
        agentLearningLoading: false,
      });
    } catch (error) {
      this.setData({
        agentLearningLoading: false,
        agentLearningError: error?.message === "empty learning words" ? "暂无可学习词汇，请切换词书后重试。" : "词汇题目加载失败，请稍后重试。",
      });
    }
  },

  async loadAgentMoreWords() {
    // Agent 内词汇学习改为固定会话词表，避免日常练习被无限预加载干扰结束条件。
  },

  async buildAgentLearningQuestions(targetWordCount) {
    const bookId = app?.store?.$state?.user?.bookId;
    const date = new Date().toISOString();
    let targets = [];

    try {
      const planRes = await this.safeServerCall({
        url: "learningData/generateLearningPlan",
        date,
        size: targetWordCount,
        bookId,
      });
      const planIds = planRes?.data?.words || [];
      if (planIds.length) {
        targets = await this.getWordsByIds(planIds.slice(0, targetWordCount));
      }
    } catch (error) {
      targets = [];
    }

    targets = await this.fillWordsToCount(bookId, targets, targetWordCount);

    const distractorSize = Math.max(targets.length * (LEARNING_OPTION_NUMBER - 1), LEARNING_OPTION_NUMBER * 4);
    const distractors = await this.getRandomWords(bookId, distractorSize);
    return this.buildLearningQuestions(targets.slice(0, targetWordCount), distractors, LEARNING_OPTION_NUMBER);
  },

  async fillWordsToCount(bookId, initialWords, targetWordCount) {
    const result = [];
    const used = new Set();
    const pushUnique = (words = []) => {
      (words || []).forEach((word) => {
        const id = word?._id ? String(word._id) : "";
        if (!id || used.has(id) || result.length >= targetWordCount) return;
        used.add(id);
        result.push(word);
      });
    };

    pushUnique(initialWords);

    let attempts = 0;
    while (result.length < targetWordCount && attempts < 4) {
      attempts += 1;
      const remain = targetWordCount - result.length;
      const sampleSize = Math.max(remain * 2, remain);
      try {
        const randomWords = await this.getRandomWords(bookId, sampleSize);
        const before = result.length;
        pushUnique(randomWords);
        if (!randomWords.length || result.length === before) break;
      } catch (error) {
        console.warn("补齐词汇失败", error);
        break;
      }
    }

    return result.slice(0, targetWordCount);
  },

  async getRandomWords(bookId, size) {
    const db = wx.cloud.database();
    const where = bookId === "random" ? {} : { bookId };
    const res = await db.collection("word").aggregate()
      .match(where)
      .limit(999999)
      .sample({ size })
      .end();
    return res?.list || [];
  },

  async getWordsByIds(ids) {
    const cleanIds = (ids || []).filter(Boolean);
    if (!cleanIds.length) return [];
    const db = wx.cloud.database();
    const command = db.command;
    const res = await db.collection("word")
      .where({ _id: command.in(cleanIds) })
      .get();
    const list = res?.data || [];
    const map = {};
    list.forEach((item) => {
      map[String(item._id)] = item;
    });
    return cleanIds.map((id) => map[String(id)]).filter(Boolean);
  },

  buildLearningQuestions(targets, distractors, optionNumber) {
    const used = new Set();
    let poolIndex = 0;

    const formatOption = (word) => {
      const trans = (word.trans || []).slice().sort(() => Math.random() - 0.5)[0];
      if (!trans) return word.word;
      return trans.pos ? `${trans.pos}.${trans.tranCn}` : trans.tranCn;
    };

    return (targets || []).map((target) => {
      const optionWords = [target];
      while (optionWords.length < optionNumber && poolIndex < distractors.length) {
        const candidate = distractors[poolIndex];
        poolIndex += 1;
        if (!candidate || String(candidate._id) === String(target._id) || used.has(String(candidate._id))) {
          continue;
        }
        used.add(String(candidate._id));
        optionWords.push(candidate);
      }

      while (optionWords.length < optionNumber) {
        optionWords.push(target);
      }

      const correctIndex = Math.floor(Math.random() * optionNumber);
      const shuffled = optionWords.slice();
      shuffled[0] = shuffled[correctIndex];
      shuffled[correctIndex] = optionWords[0];

      return {
        options: shuffled.map(formatOption),
        correctIndex,
        word: target.word,
        wordId: target._id,
        usphone: target.usphone,
      };
    });
  },

  onAgentSessionFinish() {
    const learning = app?.store?.$state?.learning;
    if (!learning) {
      this.setData({ agentLearningStarted: false });
      return;
    }

    const isRecognition = learning.mode === "recognition";
    const total = Math.max(
      Math.min(learning.wordsIndex || 0, (learning.wordList || []).length),
      (learning.correctCount || 0) + (learning.wrongCount || 0)
    );
    const correct = isRecognition ? (learning.knownCount || 0) : (learning.correctCount || 0);
    const wrong = isRecognition ? (learning.unknownCount || 0) : (learning.wrongCount || 0);
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

    this.setData({
      agentLearningStarted: false,
      agentLearningSummary: {
        title: learning.sessionType === "test" ? "词汇检测报告" : "本轮练习总结",
        subtitle: learning.sessionType === "test" ? "检测已完成，下面是本轮掌握情况。" : "日常练习已完成，下面是本轮学习情况。",
        requested: learning.targetWordCount || total,
        actual: (learning.wordList || []).length,
        total,
        correct,
        wrong,
        rate,
        wrongLimit: learning.selectedWrongLimit || this.data.selectedWrongLimit,
      },
    });
  },

  onOpenReviewPage() {
    wx.navigateTo({ url: "/pages/review/review" });
  },

  onOpenCombatPage() {
    wx.navigateTo({ url: "/pages/combatSelect/combatSelect" });
  },

  onLoad(options) {
    this.initTopBarMetrics();
    const storageMode = wx.getStorageSync(LEARNING_MODE_STORAGE_KEY);
    this.onSelectLearningMode({ currentTarget: { dataset: { mode: storageMode || "choice" } } });
    const queryModule = options?.module
      || options?.scene
      || (Object.prototype.hasOwnProperty.call(options || {}, "vocab") ? "vocabulary" : "");
    this.switchModule(queryModule || "home");
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
