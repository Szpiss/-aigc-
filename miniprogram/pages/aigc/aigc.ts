// pages/aigc/aigc.ts
Page({
	data: {
	  messageList: [], // 聊天记录
	  inputValue: "",   // 输入框内容
	  isLoading: false, // AI加载状态
	  scrollTop: 0,     // 滚动位置
	  hasHistory: false // 是否有历史消息
	},
  
	onLoad() {
	  // 模拟历史记录检测（实际可从缓存读取）
	  this.setData({ hasHistory: this.data.messageList.length > 0 });
	},
  
	// 返回上一页
	handleBack() {
	  wx.navigateBack({ delta: 1 });
	},
  
	// 输入框内容变化
	handleInput(e: any) {
	  this.setData({ inputValue: e.detail.value });
	},
  
	// 发送消息（回车/按钮）
	handleSend() {
	  const { inputValue, messageList } = this.data;
	  if (!inputValue.trim() || this.data.isLoading) return;
  
	  // 添加用户消息
	  const userMsg = { id: Date.now(), role: "user", content: inputValue };
	  this.setData({
		inputValue: "",
		messageList: [...messageList, userMsg],
		isLoading: true,
		hasHistory: true
	  });
  
	  // 滚动到底部
	  this.scrollToBottom();
  
	  // 模拟AI回复（实际调用云函数）
	  setTimeout(() => {
		const aiMsg = { 
		  id: Date.now() + 1, 
		  role: "ai", 
		  content: "这是豆包风格的AI回复，你觉得怎么样？" 
		};
		this.setData({
		  messageList: [...this.data.messageList, aiMsg],
		  isLoading: false
		});
		this.scrollToBottom();
	  }, 1500);
	},
  
	// 滚动到底部
	scrollToBottom() {
	  setTimeout(() => {
		this.setData({ scrollTop: 99999 });
	  }, 300);
	},
  
	// 加载更多历史消息（可扩展）
	handleLoadMore() {
	  // 可实现历史消息加载逻辑
	}
  });