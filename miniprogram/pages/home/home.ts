import config from './../../utils/config'
import { refreshUserInfo } from './../../utils/helper'
import { IAppOption } from './../../app'

App.Page({
  data: {},
  async onLoad () {
  },
  async onShow () {
    try {
      const app = getApp<IAppOption>()
      await app.$loginAsync
      await refreshUserInfo('home.onShow')
    } catch (error) {
      console.warn('[user-sync] home user info refresh failed', error)
    }
  },
  onShareAppMessage () {
    return config.defaultShare
  }
})
