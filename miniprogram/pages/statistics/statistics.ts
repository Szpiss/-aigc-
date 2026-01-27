import { IAppOption } from './../../app'

const app = getApp<IAppOption>()
const db = wx.cloud.database()
const command = db.command

type DailyItem = {
  date?: string | number | Date
  learningStudyTime?: number
  combatStudyTime?: number
  totalWordsCount?: number
  correctCount?: number
  wrongCount?: number
  learningCount?: number
}

type CombatRecord = {
  bookName?: string
  combatType?: string
  isWin?: boolean
  score?: number
  opponentScore?: number
  endTime?: string | number | Date
  _createTime?: string | number | Date
  duration?: number
}

App.Page({
  data: {
    activeTab: 'learning',
    loading: false,
    learningSummary: {
      learningMinutes: 0,
      wordCount: 0,
      correctRate: 0,
      learningCount: 0
    },
    trendBars: [] as Array<{ label: string; minutes: number; height: number }>,
    dailyList: [] as Array<{ label: string; learningMinutes: number; correctRate: number; wordCount: number }>,
    combatSummary: {
      total: 0,
      winRate: 0,
      avgScore: 0,
      avgMinutes: 0
    },
    combatRecords: [] as Array<{
      bookName: string
      typeLabel: string
      isWin: boolean
      score: number
      opponentScore: number
      endLabel: string
    }>
  },

  async onLoad () {
    await app.$loginAsync
    await this.refreshAll()
  },

  async onPullDownRefresh () {
    await this.refreshAll()
    wx.stopPullDownRefresh()
  },

  onSwitchTab (event: WechatMiniprogram.BaseEvent) {
    const { tab } = event.currentTarget.dataset
    if (tab) {
      this.setData({ activeTab: tab })
    }
  },

  onBack () {
    void app.router.navigateBack({ delta: 1 })
  },

  async refreshAll () {
    this.setData({ loading: true })
    await Promise.all([
      this.fetchLearningSummary(),
      this.fetchCombatRecords()
    ])
    this.setData({ loading: false })
  },

  async fetchLearningSummary () {
    try {
      const now = new Date()
      const report = await wx.cloud.callFunction({
        name: 'server',
        data: {
          url: 'learningData/getLearningReport',
          type: 'week',
          date: now.toISOString()
        }
      })

      const result = report.result as { state: number; data?: { daily?: DailyItem[] } }
      if (!result || result.state !== 0) {
        throw new Error('cloud function failed')
      }
      const daily = (result.data?.daily || []).slice().sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0
        const timeB = b.date ? new Date(b.date).getTime() : 0
        return timeA - timeB
      })

      const learningSeconds = daily.reduce((sum, item) => sum + (item.learningStudyTime || 0), 0)
      const wordCount = daily.reduce((sum, item) => sum + (item.totalWordsCount || 0), 0)
      const correctCount = daily.reduce((sum, item) => sum + (item.correctCount || 0), 0)
      const wrongCount = daily.reduce((sum, item) => sum + (item.wrongCount || 0), 0)
      const learningCount = daily.reduce((sum, item) => sum + (item.learningCount || 0), 0)

      const totalAnswer = correctCount + wrongCount
      const correctRate = totalAnswer > 0 ? Math.round((correctCount / totalAnswer) * 100) : 0
      const learningMinutes = Math.round(learningSeconds / 60)

      this.setData({
        learningSummary: {
          learningMinutes,
          wordCount,
          correctRate,
          learningCount
        }
      })

      const barItems = this.buildTrendBars(daily)
      const dailyList = daily.map((item) => {
        const minutes = Math.round((item.learningStudyTime || 0) / 60)
        const total = (item.correctCount || 0) + (item.wrongCount || 0)
        const rate = total > 0 ? Math.round(((item.correctCount || 0) / total) * 100) : 0
        return {
          label: this.formatDate(item.date),
          learningMinutes: minutes,
          correctRate: rate,
          wordCount: item.totalWordsCount || 0
        }
      })

      this.setData({ trendBars: barItems, dailyList })
    } catch (error) {
      console.error('获取学习数据失败', error)
      void wx.showToast({ title: '学习数据获取失败', icon: 'none', duration: 1500 })
    }
  },

  buildTrendBars (daily: DailyItem[]) {
    const recent = daily.slice(-7)
    const minutes = recent.map((item) => Math.round((item.learningStudyTime || 0) / 60))
    const maxValue = Math.max(...minutes, 1)

    return recent.map((item, index) => {
      const value = minutes[index]
      const height = Math.max(12, Math.round((value / maxValue) * 160))
      return {
        label: this.formatDate(item.date),
        minutes: value,
        height
      }
    })
  },

  async fetchCombatRecords () {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)

      const result = await db.collection('combatRecord')
        .where({
          _createTime: command.gte(startDate)
        })
        .orderBy('_createTime', 'desc')
        .limit(10)
        .get()

      const records = result.data as CombatRecord[]
      const total = records.length
      const win = records.filter(item => item.isWin).length
      const avgScore = total > 0
        ? Math.round(records.reduce((sum, item) => sum + (item.score || 0), 0) / total)
        : 0
      const avgMinutes = total > 0
        ? Math.round(records.reduce((sum, item) => sum + (item.duration || 0), 0) / total / 60)
        : 0
      const winRate = total > 0 ? Math.round((win / total) * 100) : 0

      const list = records.map((item) => ({
        bookName: item.bookName || '未知词书',
        typeLabel: this.formatCombatType(item.combatType),
        isWin: !!item.isWin,
        score: item.score || 0,
        opponentScore: item.opponentScore || 0,
        endLabel: this.formatDateTime(item.endTime || item._createTime)
      }))

      this.setData({
        combatSummary: {
          total,
          winRate,
          avgScore,
          avgMinutes
        },
        combatRecords: list
      })
    } catch (error) {
      console.error('获取对战记录失败', error)
      void wx.showToast({ title: '对战数据获取失败', icon: 'none', duration: 1500 })
    }
  },

  formatCombatType (type?: string) {
    if (type === 'friend') return '好友'
    if (type === 'random') return '随机'
    if (type === 'npc') return '人机'
    return '对战'
  },

  formatDate (date?: string | number | Date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  },

  formatDateTime (date?: string | number | Date) {
    if (!date) return ''
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hour = d.getHours()
    const minute = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hour}:${minute}`
  }
})
