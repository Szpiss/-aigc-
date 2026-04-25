import wordModel from './../../models/word'
import config from './../../utils/config'
import { store, IAppOption, events } from './../../app'
import { formatWordList } from './../../utils/helper'
import { loading, toast } from './../../utils/util'
import { recordLearningData } from './../../utils/learningDataRecorder'
import {
  getVocabularyLearningMode,
  getVocabularyLearningModeLabel,
  VocabularyLearningMode
} from './../../utils/vocabularyLearningMode'

const app = getApp<IAppOption>()

/** 是否通过分享后，再次显示当前页面 */
let isShareBack = false

App.Page({
  data: {
    learningModeLabel: getVocabularyLearningModeLabel('choice')
  },
  async onLoad () {
    await app.$loginAsync
    const mode = getVocabularyLearningMode()
    this.setData({ learningModeLabel: getVocabularyLearningModeLabel(mode) })
    await this.initPageData(mode)
  },

  async initPageData (mode: VocabularyLearningMode = 'choice') {
    if (!store.$state.user?.bookId) {
      toast.show('获取用户数据失败，请重试', 1200).finally(() => { this.onBack() })
      return
    }

    loading.show('加载中 ...')

    void wx.setNavigationBarTitle({ title: '词汇学习' })

    await new Promise(resolve => store.setState({
      learning: {
        mode,
        wordsIndex: 0,
        score: 0,
        healthPoint: config.learningHealthPoint,
        wordList: [],
        countdown: config.learningCountDown,
        experience: 0
      }
    }, resolve))

    await this.loadWordsData()
    loading.hide()

    // 记录学习开始时间（存储在全局对象中，供组件使用）
    app.learningStartTime = new Date()
  },

  async loadWordsData () {
    const userinfo = store.$state.user

    const planWords = await this.getPlanWords(userinfo.bookId)

    let wordList = []
    if (planWords.length > 0) {
      const distractorSize = planWords.length * (config.learningOptionNumber - 1)
      const distractors = await wordModel.getRandomWords(userinfo.bookId, distractorSize)
      wordList = this.buildLearningQuestions(planWords, distractors, config.learningOptionNumber)
    } else {
      // NOTE: 1. 获取单词数据
      const words = await wordModel.getRandomWords(userinfo.bookId, config.learningPageSize * config.learningOptionNumber)
      // NOTE: 2. 格式化单词数据
      wordList = formatWordList(words, config.learningOptionNumber)
    }

    // NOTE: 3. 本地 store 的数据增加网络上获取的最新数据
    store.setState({ learning: { ...store.$state.learning!, wordList: store.$state.learning!.wordList.concat(wordList) } })
  },

  async getPlanWords (bookId: string) {
    const date = new Date().toISOString()
    try {
      const planRes = await wx.cloud.callFunction({
        name: 'server',
        data: {
          url: 'learningData/getLearningPlan',
          date,
          bookId
        }
      })

      const planResult = planRes.result as { state: number; data?: { words?: string[] } | null }
      if (planResult?.state === 0 && planResult.data?.words?.length) {
        return await wordModel.getWordsByIds(planResult.data.words)
      }

      const generateRes = await wx.cloud.callFunction({
        name: 'server',
        data: {
          url: 'learningData/generateLearningPlan',
          date,
          size: config.learningPageSize,
          bookId
        }
      })

      const genResult = generateRes.result as { state: number; data?: { words?: string[] } }
      if (genResult?.state === 0 && genResult.data?.words?.length) {
        return await wordModel.getWordsByIds(genResult.data.words)
      }
    } catch (error) {
      console.warn('获取学习计划失败，使用随机词表', error)
    }

    return []
  },

  buildLearningQuestions (targets: Array<{ _id: string; word: string; usphone: string; trans: Array<{ tranCn: string; pos: string }> }>, distractors: Array<{ _id: string; word: string; usphone: string; trans: Array<{ tranCn: string; pos: string }> }>, optionNumber: number) {
    const questions = []
    const used = new Set<string>()
    let poolIndex = 0

    const formatOption = (word) => {
      const trans = (word.trans || []).slice().sort(() => Math.random() - 0.5)[0]
      if (!trans) {
        return word.word
      }
      return trans.pos ? `${trans.pos}.${trans.tranCn}` : trans.tranCn
    }

    targets.forEach((target) => {
      const options = []
      const optionWords = []

      optionWords.push(target)
      while (optionWords.length < optionNumber && poolIndex < distractors.length) {
        const candidate = distractors[poolIndex]
        poolIndex++
        if (!candidate || String(candidate._id) === String(target._id)) {
          continue
        }
        if (used.has(String(candidate._id))) {
          continue
        }
        used.add(String(candidate._id))
        optionWords.push(candidate)
      }

      while (optionWords.length < optionNumber) {
        optionWords.push(target)
      }

      const correctIndex = Math.floor(Math.random() * optionNumber)
      const shuffled = optionWords.slice()
      const targetWord = optionWords[0]
      shuffled[0] = shuffled[correctIndex]
      shuffled[correctIndex] = targetWord

      shuffled.forEach((word) => options.push(formatOption(word)))

      questions.push({
        options,
        correctIndex,
        word: target.word,
        wordId: target._id,
        usphone: target.usphone
      })
    })

    return questions
  },

  onBack () {
    if (getCurrentPages().length === 1) {
      void app.routes.pages.home.redirectTo({})
    } else {
      void app.router.navigateBack({ delta: 1 })
    }
  },

  onChangeMode () {
    void app.routes.pages.setting.go({})
  },

  onShow () {
    if (isShareBack) {
      events.emit('showLearningPopup', false) // 隐藏分享弹窗
      events.emit('learningNextWord', 'share') // 通过分享途径切换下一题
      events.emit('playLearningBgm', true)
      isShareBack = false
    }
  },

  onShareAppMessage ({ from }) {
    if (from === 'button') {
      isShareBack = true
      return {
        title: `❤ 我正在练习「${store.getState().book.name}」，每天进步积累一点哦 ~`,
        path: '/pages/home/home',
        imageUrl: './../../images/share-pk-bg.png'
      }
    }

    return config.defaultShare
  }
})
