import { COMBAT_TYPE } from './../../typings/model'
import { getUserInfo, formatCombatInfo } from './../../utils/helper'
import { throttle } from './../../utils/util'
import { IAppOption, store } from './../../app'

const app = getApp<IAppOption>()

App.Page({
  data: {
    loading: false
  },

  onBack () {
    void app.router.navigateBack({ delta: 1 })
  },

  onRandomMatch: throttle(async function () {
    const userinfo = await getUserInfo()
    const book = store.getState().book
    const combatInfo = formatCombatInfo(userinfo, book, 'random', new Array(+userinfo.config.combatQuestionNumber).fill({}))

    store.setState({
      combat: { ...combatInfo, state: 'lock', next: '', _id: '', _createTime: '', isOwner: true }
    })

    void app.routes.pages.combat.go({ type: 'random' })
  }, 500),

  onChallengeFriend: throttle(async function () {
    const userinfo = await getUserInfo()
    const book = store.getState().book

    const combatInfo = formatCombatInfo(userinfo, book, 'friend', new Array(+userinfo.config.combatQuestionNumber).fill({}))

    store.setState({
      combat: { ...combatInfo, state: 'create', next: '', _id: '', _createTime: '', isOwner: true }
    })

    void app.routes.pages.combat.go({ type: 'friend', state: 'create' })
  }, 500),

  onNpcMatch: throttle(async function () {
    await getUserInfo()
    void app.routes.pages.combat.go({ type: 'npc' as COMBAT_TYPE })
  }, 500)
})
