Page({
	data: {
	  chatMode: "bot",
	  showBotAvatar: true,
	  agentConfig: {
		// ============ ↓↓↓ 把这行改成你自己的真实BotId ↓↓↓ ============
		botId: "ibot-yingyuxuexi-fg8vn8", // 这是你的真实BotId，替换掉原来的 agent-ryan-xxx
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
			name: "get_weather",
			description: "获取指定城市的天气",
			parameters: {
			  type: "object",
			  properties: { city: { type: "string" } },
			  required: ["city"],
			},
			handler: (params) => {
			  const { city } = params;
			  return `城市${city}的天气是晴朗的，温度是25摄氏度，无风`;
			}
		  },
		  {
			name: "get_location",
			description: "获取指定城市的经纬度",
			parameters: {
			  type: "object",
			  properties: { city: { type: "string" } },
			  required: ["city"],
			},
			handler: async (params) => {
			  const { city } = params;
			  return new Promise((resolve) => {
				setTimeout(() => {
				  resolve(`城市${city}的位置是东经114.305556度，北纬22.543056度`);
				}, 2000);
			  });
			},
		  },
		],
	  },
	  modelConfig: {
		modelProvider: "deepseek",
		quickResponseModel: "deepseek-v3.2",
		logo: "",
		welcomeMsg: "👋 欢迎使用英语学习助手！我可以帮你翻译、背单词、检查语法，随时提问哦～",
	  },
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