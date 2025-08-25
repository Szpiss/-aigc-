import { COMBAT_TYPE } from './../../../../../typings/model'
import { getUserInfo, formatCombatInfo } from './../../../../utils/helper'
import { throttle } from './../../../../utils/util'
import { IAppOption, store } from './../../../../app'

const app = getApp<IAppOption>()

App.Component({
  options: {
    addGlobalClass: true
  },
  methods: {
    /**
     * 随机匹配
     */
    onRandomMatch: throttle(async function (this: {createCombat: (combatType: COMBAT_TYPE) => Promise<void>}) {
      const userinfo = await getUserInfo()
      const book = store.getState().book
      const combatInfo = formatCombatInfo(userinfo, book, 'random', new Array(+userinfo.config.combatQuestionNumber).fill({}))

      store.setState({
        combat: { ...combatInfo, state: 'lock', next: '', _id: '', _createTime: '', isOwner: true }
      })

      void app.routes.pages.combat.go({ type: 'random' })
    }, 500),

    /**
     * 好友对战
     */
    onChallengeFriend: throttle(async function (this: {createCombat: (combatType: COMBAT_TYPE) => Promise<void>}) {
      const userinfo = await getUserInfo()
      const book = store.getState().book

      const combatInfo = formatCombatInfo(userinfo, book, 'friend', new Array(+userinfo.config.combatQuestionNumber).fill({}))

      store.setState({
        combat: { ...combatInfo, state: 'create', next: '', _id: '', _createTime: '', isOwner: true }
      })

      void app.routes.pages.combat.go({ type: 'friend', state: 'create' })
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
     * 每日词汇
     */
    async onChallengeWord () {
      await getUserInfo()
      void app.routes.pages.learning.go({})
    },

    /**
     * 生词本
     */
    onToUserWords () {
      void app.routes.pages.review.go({})
    }
  }
})
