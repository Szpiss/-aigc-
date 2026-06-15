import { getUserInfo } from './../../../../utils/helper'
import { throttle } from './../../../../utils/util'
import { IAppOption } from './../../../../app'

const app = getApp<IAppOption>()

App.Component({
  options: {
    addGlobalClass: true
  },
  methods: {
    /**
     * 单词对战入口
     */
    onCombatModule: throttle(async function () {
      await getUserInfo()
      void app.routes.pages.combatSelect.go({})
    }, 500),

    /**
     * AIGC英语学习助手
     */
    onAIGC: throttle(async function() {
      // 可以添加必要的前置检查，如用户登录状态等
      await getUserInfo(); // 确保用户信息已加载
      
	  void app.routes.pages.aigc.go({});
      }, 500),

    /**
     * 词汇学习
     */
    async onChallengeWord () {
      await getUserInfo()
      void app.routes.pages.aigc.go({ module: 'vocabulary' })
    },

    /**
     * 生词本
     */
    onToUserWords () {
      void app.routes.pages.review.go({})
    },

    /**
     * 数据看板
     */
    onToStatistics () {
      void app.routes.pages.statistics.go({})
    }
  }
})
