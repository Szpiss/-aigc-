import 'umeng-polyfill'
import config from './utils/config'
import Store from 'wxministore'
import userModel from './models/user'
import KvModel from './models/kv'
import state, { State } from './utils/state'
import { User } from './../typings/model'
import { loading } from './utils/util'
import router, { IRoutes } from './utils/routes'
import type { Router } from 'wxapp-router'
import mitt, { Emitter } from 'mitt'

type IEvents = Emitter<{
  /** 开始人机对战 */
  startNPCCombat: unknown
  /** 进行人机选择 */
  npcSelect: unknown
  /** 自动人机选择倒计时 */
  autoNPCSelect: unknown
  /** 播放词汇学习的单词发音 */
  playLearningPronunciation: unknown
  /** 播放词汇学习的背景音乐 */
  playLearningBgm: boolean
  /** 词汇学习使用提示卡 */
  onGetLearningTip: unknown
  /** 词汇学习展示「复活」、「再来一局」弹窗，true: 显示 false: 隐藏 */
  showLearningPopup: boolean
  /** 词汇学习切换下一题 (通过 popup 途径) */
  learningNextWord: string
}>

export const store = new Store<State>({
  state,
  pageListener: {
    async onLoad () {
      loading.show()
      await getApp<IAppOption>().$loginAsync
      loading.hide()
    }
  }
})

export const events: IEvents = mitt()

type $loginAsync = Promise<User>

export interface IAppOption {
  store: Store<State>
  router: Router
  routes: IRoutes
  events: IEvents
  $loginAsync?: $loginAsync
  learningStartTime?: Date | null
  initEnv: () => Promise<void>
  initUiGlobal: () => void
  login: () => $loginAsync
  initConfig: () => Promise<void>
}

App<IAppOption>({
  store,
  router,
  routes: router.getRoutes() as IRoutes,
  events,
  async onLaunch () {
    this.initUiGlobal()

    // 初始化云开发，赋值 cloudEnv 才可进行云开发操作
    await this.initEnv()

    void this.initConfig()
    this.$loginAsync = this.login()
  },

  initUiGlobal () {
    const { statusBarHeight, screenHeight, windowWidth } = wx.getSystemInfoSync()
    const capsule = wx.getMenuButtonBoundingClientRect()

    // 计算胶囊按钮的高度，作为头部内容区高度
    const CustomBarHeight = capsule.bottom + capsule.top - statusBarHeight

    store.setState({
      ui: {
        statusBarHeight,
        screenHeight,
        windowWidth,
        CustomBarHeight
      }
    })
  },

  async initEnv () {
    return await new Promise((resolve) => {
      const envVersion = __wxConfig.envVersion

      // 开发环境 (develop)：编辑器环境
      // 正式环境 (release)：小程序体验版 和 正式版
      const env = envVersion === 'develop' ? config.cloudEnv.develop : config.cloudEnv.release
      wx.cloud.init({ env, traceUser: true })

      store.setState({ cloudEnv: env }, resolve)
    })
  },

  async initConfig () {
    const appConfig = await KvModel.getData('config')
    if (appConfig) {
      store.setState({ appConfig })
    } else {
      void wx.showToast({ title: '小程序配置获取失败，请稍后重试', icon: 'none', duration: 2000 })
    }
  },

  async login (): Promise<User> {
    const selfInfo = await userModel.login()
    const user = { ...selfInfo, book: undefined }
    const book = selfInfo.book[0]
    await new Promise(resolve => store.setState({ user, book }, resolve))
    return user
  }
})

wx.cloud.init({
	// env：你的云环境ID，直接复制你的值即可
	env: "cloud1-9gs5ba14ed2d8844",
	traceUser: true,
  });
