import { getUserInfo } from './../../../../utils/helper'
import { IAppOption } from './../../../../app'

const app = getApp<IAppOption>()

App.Component({
  methods: {
    async onGetUserInfo () {
      await getUserInfo(true)
    },
    onToRanking () {
      void app.routes.pages.ranking.go({})
    },
    onToSetting () {
      void app.routes.pages.setting.go({})
    }
  }
})
