import { throttle, playAudio, sleep } from './../../../../utils/util'
import { LearningWord } from './../../../../utils/state'
import config from './../../../../utils/config'
import { store, events, IAppOption } from './../../../../app'
import userWordModel from './../../../../models/userWord'
import userModel from './../../../../models/user'
import { recordLearningData } from './../../../../utils/learningDataRecorder'
import { refreshUserInfo } from './../../../../utils/helper'

type SelectEvent = WechatMiniprogram.BaseEvent<WechatMiniprogram.IAnyObject, {index: number, useTip?: boolean} >
type RecognitionEvent = WechatMiniprogram.BaseEvent<WechatMiniprogram.IAnyObject, {known: boolean | string} >

interface IProblem {
  properties: {
    wordItem: LearningWord
  }
  clearStateInit: () => void
  next: () => void
  onSelectCorrect: (useTip: boolean, wordId: string) => void
  onSelectWrong: (wordId: string) => boolean
  finishLearningSession: () => void
  recordLearningResult: (result: { correct: boolean; known?: boolean; wordId: string }) => void
  triggerEvent: WechatMiniprogram.Component.InstanceMethods<{}>['triggerEvent']
  data: {
    canSelect: boolean
    showMeaning: boolean
  }
}

enum OptionIndex {
  notSelect = -2, // 未选择
  wrongSelect = -1 // 选择错误
}

const TIMER_NULL = -1

let countdownTimer = TIMER_NULL
const app = getApp<IAppOption>()

App.Component({
  data: {
    selectIndex: OptionIndex.notSelect,
    optionsAnimation: {},
    canSelect: true,
    showMeaning: false
  },
  options: {
    addGlobalClass: true
  },
  properties: {
    wordItem: {
      type: Object,
      value: {}
    }
  },
  lifetimes: {
    ready () {
      // NOTE: 第一题的选项展示不需要动画
      void this.clearStateInit(false)
      events.on('onGetLearningTip', this.onGetTip.bind(this))
      events.on('learningNextWord', this.next.bind(this))
    },
    detached () {
      clearInterval(countdownTimer)
      events.off('onGetLearningTip')
    }
  },
  methods: {

    onSelectOption: throttle(async function (this: IProblem, event: SelectEvent) {
      if (!this.data.canSelect) {
        void wx.showToast({ title: '点击太快，请稍等', icon: 'none', duration: 1200 })
        return
      }
      this.data.canSelect = false

      const { currentTarget: { dataset: { index: selectIndex, useTip = false } } } = event

      const { correctIndex, wordId } = this.properties.wordItem

      // @ts-expect-error
      this.setData({ selectIndex })

      if (selectIndex === correctIndex) { // 选择正确
        this.onSelectCorrect(useTip, wordId)
      } else {
        const canContinue = this.onSelectWrong(wordId)
        if (!canContinue) { return } // 检测模式没有生命值了，不再继续下一题
      }

      this.next()
    }, 500),

    onRevealRecognition () {
      this.setData({ showMeaning: true })
    },

    onSelectRecognition: throttle(async function (this: IProblem, event: RecognitionEvent) {
      if (!this.data.canSelect) {
        void wx.showToast({ title: '点击太快，请稍等', icon: 'none', duration: 1200 })
        return
      }
      this.data.canSelect = false

      const known = event.currentTarget.dataset.known === true || event.currentTarget.dataset.known === 'true'
      const { wordId } = this.properties.wordItem

      if (known) {
        this.onSelectCorrect(false, wordId)
      } else {
        void userWordModel.add(wordId)
        this.recordLearningResult({ correct: false, known: false, wordId })
        void wx.showToast({ title: '已加入复习，之后会重点练这个词', icon: 'none', duration: 1200 })
        const learning = store.$state.learning!
        const wrongLimit = learning.selectedWrongLimit || config.learningHealthPoint
        if (learning.sessionType === 'test' && (learning.wrongCount || 0) >= wrongLimit) {
          this.finishLearningSession()
          return
        }
      }

      await this.next()
    }, 500),

    async next () {
      const learning = store.$state.learning!
      const nextWordsIndex = learning.wordsIndex + 1

      await sleep(800)

      if (nextWordsIndex >= learning.wordList.length) {
        store.setState({ learning: { ...store.$state.learning!, wordsIndex: nextWordsIndex } })
        this.finishLearningSession()
        return
      }

      void this.clearStateInit()
      await sleep(220) // NOTE: 延迟一小会，等选项动画开始切换了，再切换题目
      store.setState({ learning: { ...store.$state.learning!, wordsIndex: nextWordsIndex } })
    },

    onSelectCorrect (useTip: boolean, wordId: string) {
      playAudio(config.audios.selectCorrect)

      if (useTip) {
        // NOTE: 本地提示卡数目 - 1
        store.setState({ user: { ...store.$state.user, totalTip: store.$state.user.totalTip - 1 } })

        // NOTE: 使用提示卡答题的都加入到生词本
        void userWordModel.add(wordId)

        // NOTE: 选择成功，如果是使用提示卡的，数据库中提示卡数目 - 1
        void userModel.addTotalTip(-1)
      }

      // 选择正确 当前分数 + 1
      store.setState({
        learning: {
          ...store.$state.learning!,
          score: store.$state.learning!.score + 1,
          experience: store.$state.learning!.experience + 1 // 词力值 + 1，答题结束后弹窗时进行结算并清空
        }
      })

      this.recordLearningResult({
        correct: true,
        known: store.$state.learning?.mode === 'recognition' ? true : undefined,
        wordId
      })
    },

    /**
     * 题目选择错误的处理，返回是否还有机会继续下一题，返回 true 可继续答题
     * @param wordId 词汇 id
     */
    onSelectWrong (wordId: string): boolean {
      void userWordModel.add(wordId)
      playAudio(config.audios.selectWrong)
      store.$state.user.config.vibrate && wx.vibrateShort({ type: 'light' })

      this.recordLearningResult({ correct: false, wordId })

      if (store.$state.learning?.sessionType === 'daily') {
        return true
      }

      const learning = store.$state.learning!
      const wrongLimit = learning.selectedWrongLimit || config.learningHealthPoint
      const wrongCount = learning.wrongCount || 0

      if (wrongCount >= wrongLimit) {
        this.finishLearningSession()
        return false
      }

      return true
    },

    recordLearningResult (result: { correct: boolean; known?: boolean; wordId: string }) {
      const learning = store.$state.learning!
      const current = this.properties.wordItem
      const wordEntry = {
        wordId: result.wordId,
        word: current?.word || ''
      }

      const nextLearning = {
        ...learning,
        correctCount: learning.correctCount + (result.correct ? 1 : 0),
        wrongCount: learning.wrongCount + (!result.correct ? 1 : 0),
        knownCount: learning.knownCount + (result.known === true ? 1 : 0),
        unknownCount: learning.unknownCount + (result.known === false ? 1 : 0),
        wrongWords: result.correct ? learning.wrongWords : learning.wrongWords.concat(wordEntry),
        unknownWords: result.known === false ? learning.unknownWords.concat(wordEntry) : learning.unknownWords
      }

      store.setState({ learning: nextLearning })
    },

    finishLearningSession () {
      // NOTE: 当数据库中的最大分数小于本地得分时，更新数据库中的历史最高分数
      const score = store.$state.learning?.score ?? 0
      if (store.$state.user.learning.maxScore <= score) {
        const book = store.$state.book.shortName
        void userModel.updateLearing(score, book).then((res) => {
          res && store.setState({ // 更新本地历史最大得分
            user: {
              ...store.$state.user,
              learning: {
                maxScore: score,
                bookShortName: book
              }
            }
          })
        })
      }

      const experience = store.$state.learning?.experience ?? 0
      if (experience) {
        void userModel.incExperience(experience, false, 'learning').then(res => {
          if (!res) { return }

          const beforeExperience = store.$state.user.experience
          const nextUser = {
            ...store.$state.user,
            experience: beforeExperience + experience
          }

          store.setState({ // 更新用户的词力值
            user: nextUser,
            learning: {
              ...store.$state.learning!,
              experience: 0 // 清空待增加的词力值，答题后下轮结束答题再结算剩余词力值
            }
          })

          console.log('[user-sync] learning experience updated', {
            beforeExperience,
            incExperience: experience,
            afterExperience: nextUser.experience
          })

          void refreshUserInfo('learning.finish')
        }).catch(error => {
          console.warn('[user-sync] learning experience update failed', error)
        })
      }

      const book = store.$state.book
      const learningStartTime = app.learningStartTime ?? undefined
      if (book && learningStartTime) {
        void recordLearningData({
          bookId: book._id,
          bookName: book.name,
          startTime: learningStartTime.toISOString(),
          endTime: new Date().toISOString()
        })
        app.learningStartTime = null
      }

      clearInterval(countdownTimer)
      events.emit('playLearningBgm', false) // 停止背景音乐的播放
      this.triggerEvent('sessionFinish')
    },

    playOptionsAnimation () {
      const animate = wx.createAnimation({ duration: 550, timingFunction: 'ease-in-out' })
      animate.scaleX(0.1).opacity(0.1).step()
      animate.scaleX(1).opacity(1).step()
      this.setData({ optionsAnimation: animate.export() })
    },

    async clearStateInit (playAnimation = true) {
      playAnimation && this.playOptionsAnimation()
      this.setData({
        selectIndex: OptionIndex.notSelect,
        showMeaning: false
      })
      store.setState({ learning: { ...store.$state.learning!, countdown: config.learningCountDown } })

      clearInterval(countdownTimer) // NOTE: 不继续本题的倒计时了

      if (store.$state.learning?.mode === 'recognition') {
        wx.nextTick(async () => {
          await sleep(300)
          this.playPronunciation()
          this.data.canSelect = true
        })
        return
      }

      // 延迟等待选项动画接近完成，再开始倒计时、解除选择锁定
      wx.nextTick(async () => {
        await sleep(600)

        // 600 > 220 播放发音时的 wordsIndex 在 onSelectOption 已经 + 1
        this.playPronunciation()
        this.data.canSelect = true
        if (store.$state.learning?.sessionType === 'test') {
          this.countdown()
        }
      })
    },

    // TODO: 生命值没有了之后更新服务器分数
    updateServerScore () {

    },

    countdown () {
      clearInterval(countdownTimer)

      countdownTimer = setInterval(() => {
        const learning = store.getState().learning!
        const countdownTime = learning.countdown

        if (countdownTime === 1) {
          if (this.data.canSelect) {
            const e = { currentTarget: { dataset: { index: -1 } } }
            this.onSelectOption(e)
          }
          clearInterval(countdownTimer)
        }

        store.setState({ learning: { ...store.$state.learning!, countdown: countdownTime - 1 } })
      }, 1000)
    },

    onGetTip: throttle(async function (this: {onSelectOption: (event: SelectEvent) => Promise<void>}) {
      const totalTip = store.$state.user.totalTip
      if (totalTip <= 0) {
        void wx.showToast({ title: '没有提示卡了哦', icon: 'none', duration: 800 })
        return
      }

      const wordsIndex = store.$state.learning?.wordsIndex!

      void this.onSelectOption({
        // @ts-expect-error
        currentTarget: {
          dataset: {
            index: store.$state.learning?.wordList[wordsIndex].correctIndex!,
            useTip: true
          }
        }
      })
    }, 500),

    playPronunciation () {
      store.$state.user.config.pronounce && events.emit('playLearningPronunciation')
    }

  }
})
