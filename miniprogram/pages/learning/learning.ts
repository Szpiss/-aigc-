import wordModel from './../../models/word'
import config from './../../utils/config'
import { store, IAppOption, events } from './../../app'
import { loading, toast } from './../../utils/util'
import type { Word } from './../../../typings/model'
import type { VocabularySessionType } from './../../utils/state'
import {
  getVocabularyLearningMode,
  getVocabularyLearningModeLabel,
  VocabularyLearningMode
} from './../../utils/vocabularyLearningMode'

const app = getApp<IAppOption>()

type LearningPhase = 'home' | 'setup' | 'session' | 'summary'

type SessionSummary = {
  title: string
  subtitle: string
  total: number
  correct: number
  wrong: number
  known: number
  unknown: number
  rate: number
  primaryLabel: string
  weakTitle: string
  weakWords: Array<{ wordId: string; word: string }>
}

/** 是否通过分享后，再次显示当前页面 */
let isShareBack = false

App.Page({
  data: {
    phase: 'home' as LearningPhase,
    selectedSessionType: 'daily' as VocabularySessionType,
    selectedPracticeMode: getVocabularyLearningMode(),
    selectedPracticeModeLabel: getVocabularyLearningModeLabel(getVocabularyLearningMode()),
    selectedWordCount: 25,
    dailyWordCounts: [25, 50, 100],
    testWordCount: 4,
    actualWordCount: 0,
    loadError: '',
    sessionTitle: '',
    sessionDesc: '',
    summary: null as unknown as SessionSummary
  },

  async onLoad () {
    await app.$loginAsync
    void wx.setNavigationBarTitle({ title: '词汇学习' })
    const mode = getVocabularyLearningMode()
    this.setData({
      phase: 'home',
      selectedPracticeMode: mode,
      selectedPracticeModeLabel: getVocabularyLearningModeLabel(mode)
    })
  },

  onChooseSession (event: WechatMiniprogram.BaseEvent<WechatMiniprogram.IAnyObject, {type: VocabularySessionType}>) {
    const sessionType = event.currentTarget.dataset.type || 'daily'
    const defaultMode = getVocabularyLearningMode()
    this.setData({
      phase: 'setup',
      selectedSessionType: sessionType,
      selectedPracticeMode: defaultMode,
      selectedPracticeModeLabel: getVocabularyLearningModeLabel(defaultMode),
      selectedWordCount: sessionType === 'daily' ? this.data.selectedWordCount : this.data.testWordCount,
      loadError: ''
    })
  },

  onSelectWordCount (event: WechatMiniprogram.BaseEvent<WechatMiniprogram.IAnyObject, {count: number}>) {
    const count = Number(event.currentTarget.dataset.count || 25)
    this.setData({ selectedWordCount: count })
  },

  onSelectPracticeMode (event: WechatMiniprogram.BaseEvent<WechatMiniprogram.IAnyObject, {mode: VocabularyLearningMode}>) {
    const mode = event.currentTarget.dataset.mode || 'choice'
    this.setData({
      selectedPracticeMode: mode,
      selectedPracticeModeLabel: getVocabularyLearningModeLabel(mode)
    })
  },

  onBackToHome () {
    this.setData({ phase: 'home', loadError: '' })
  },

  async onStartSession () {
    const sessionType = this.data.selectedSessionType
    const mode = this.data.selectedPracticeMode
    const wordCount = sessionType === 'daily'
      ? this.data.selectedWordCount
      : this.data.testWordCount

    await this.initPageData({ sessionType, mode, wordCount })
  },

  async initPageData (options: {
    sessionType: VocabularySessionType
    mode: VocabularyLearningMode
    wordCount: number
  }) {
    if (!store.$state.user?.bookId) {
      toast.show('获取用户数据失败，请重试', 1200).finally(() => { this.onBack() })
      return
    }

    loading.show('准备词汇 ...')
    this.setData({ loadError: '', summary: null as unknown as SessionSummary })

    await new Promise(resolve => store.setState({
      learning: {
        mode: options.mode,
        sessionType: options.sessionType,
        targetWordCount: options.wordCount,
        wordsIndex: 0,
        score: 0,
        healthPoint: config.learningHealthPoint,
        wordList: [],
        countdown: config.learningCountDown,
        experience: 0,
        correctCount: 0,
        wrongCount: 0,
        knownCount: 0,
        unknownCount: 0,
        wrongWords: [],
        unknownWords: []
      }
    }, resolve))

    await this.loadWordsData()
    loading.hide()

    const actualWordCount = store.$state.learning?.wordList.length || 0
    if (actualWordCount <= 0) {
      this.setData({
        phase: 'setup',
        loadError: '当前词书暂时没有可练习的单词，请切换词书后重试。'
      })
      return
    }

    if (actualWordCount < options.wordCount) {
      void wx.showToast({
        title: `词库不足，本轮使用 ${actualWordCount} 词`,
        icon: 'none',
        duration: 1600
      })
    }

    this.setData({
      phase: 'session',
      actualWordCount,
      sessionTitle: options.sessionType === 'daily' ? '日常练习' : '词汇检测',
      sessionDesc: this.getSessionDesc(options.sessionType, options.mode)
    })

    // 记录学习开始时间（存储在全局对象中，供组件使用）
    app.learningStartTime = new Date()
  },

  async loadWordsData () {
    const learning = store.$state.learning
    const userinfo = store.$state.user
    if (!learning) return

    const loaded = learning.wordList.length
    const remain = Math.max(learning.targetWordCount - loaded, 0)
    if (remain <= 0) return

    const targets = await this.getSessionTargetWords(userinfo.bookId, remain)
    if (!targets.length) return

    const distractorSize = Math.max(targets.length * (config.learningOptionNumber - 1), config.learningOptionNumber)
    let distractors: Word[] = []
    try {
      distractors = await wordModel.getRandomWords(userinfo.bookId, distractorSize)
    } catch (error) {
      console.warn('获取干扰项失败，使用目标词兜底', error)
    }

    const wordList = this.buildLearningQuestions(targets, distractors, config.learningOptionNumber)
    store.setState({
      learning: {
        ...store.$state.learning!,
        wordList: store.$state.learning!.wordList.concat(wordList)
      }
    })
  },

  async getSessionTargetWords (bookId: string, size: number): Promise<Word[]> {
    const planWords = await this.getPlanWords(bookId, size)
    const result: Word[] = []
    const used = new Set<string>()

    planWords.forEach((word) => {
      if (!word?._id || used.has(String(word._id)) || result.length >= size) return
      used.add(String(word._id))
      result.push(word)
    })

    if (result.length >= size) return result

    try {
      const randomWords = await wordModel.getRandomWords(bookId, size - result.length)
      randomWords.forEach((word) => {
        if (!word?._id || used.has(String(word._id)) || result.length >= size) return
        used.add(String(word._id))
        result.push(word)
      })
    } catch (error) {
      console.warn('获取随机词失败', error)
    }

    return result
  },

  async getPlanWords (bookId: string, size: number) {
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
        return await wordModel.getWordsByIds(planResult.data.words.slice(0, size))
      }

      const generateRes = await wx.cloud.callFunction({
        name: 'server',
        data: {
          url: 'learningData/generateLearningPlan',
          date,
          size,
          bookId
        }
      })

      const genResult = generateRes.result as { state: number; data?: { words?: string[] } }
      if (genResult?.state === 0 && genResult.data?.words?.length) {
        return await wordModel.getWordsByIds(genResult.data.words.slice(0, size))
      }
    } catch (error) {
      console.warn('获取学习计划失败，使用随机词表', error)
    }

    return []
  },

  buildLearningQuestions (targets: Word[], distractors: Word[], optionNumber: number) {
    const questions = []
    const used = new Set<string>()
    let poolIndex = 0

    const formatOption = (word: Word) => {
      const trans = (word.trans || []).slice().sort(() => Math.random() - 0.5)[0]
      if (!trans) {
        return word.word
      }
      return trans.pos ? `${trans.pos}.${trans.tranCn}` : trans.tranCn
    }

    targets.forEach((target) => {
      const options: string[] = []
      const optionWords: Word[] = []

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

  getSessionDesc (sessionType: VocabularySessionType, mode: VocabularyLearningMode) {
    if (sessionType === 'daily') {
      return mode === 'choice'
        ? '日常练习不会因答错提前结束，答错后记录错词并继续下一词。'
        : '按本轮词数逐个自评掌握情况，释义默认隐藏，可随时查看。'
    }

    return mode === 'choice'
      ? '词汇检测保留三次机会机制，答错会扣机会，结束后生成检测报告。'
      : '词汇检测使用短流程掌握度检查，适合快速判断当前状态。'
  },

  onSessionFinish () {
    events.emit('playLearningBgm', false)
    const learning = store.$state.learning
    if (!learning) return

    const answered = Math.min(learning.wordsIndex, learning.wordList.length)
    const isRecognition = learning.mode === 'recognition'
    const correct = isRecognition ? learning.knownCount : learning.correctCount
    const wrong = isRecognition ? learning.unknownCount : learning.wrongCount
    const total = Math.max(answered, correct + wrong, 0)
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0

    const summary: SessionSummary = {
      title: learning.sessionType === 'daily' ? '本轮练习总结' : '词汇检测报告',
      subtitle: learning.sessionType === 'daily'
        ? '日常练习已完成，下面是本轮词汇吸收情况。'
        : '检测已结束，下面是本轮掌握情况反馈。',
      total,
      correct,
      wrong,
      known: learning.knownCount,
      unknown: learning.unknownCount,
      rate,
      primaryLabel: learning.sessionType === 'daily' ? '再练一轮' : '再测一次',
      weakTitle: isRecognition ? '不认识词列表' : '错词列表',
      weakWords: isRecognition ? learning.unknownWords : learning.wrongWords
    }

    this.setData({ phase: 'summary', summary })
  },

  onRestartSession () {
    this.setData({ phase: 'setup', summary: null as unknown as SessionSummary })
  },

  onPracticeWeakWords () {
    void app.routes.pages.review.go({})
  },

  onBack () {
    if (this.data.phase === 'setup') {
      this.onBackToHome()
      return
    }

    if (getCurrentPages().length === 1) {
      void app.routes.pages.home.redirectTo({})
    } else {
      void app.router.navigateBack({ delta: 1 })
    }
  },

  onShow () {
    if (isShareBack) {
      events.emit('showLearningPopup', false) // 隐藏旧分享弹窗
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
