/**
 * 学习数据记录工具
 * 用于对战和词汇学习数据的采集和上报
 */

import { store } from './../app'
import config from './../utils/config'

/**
 * 记录对战数据
 */
export async function recordCombatData(options: {
  combatId: string
  combatType: 'friend' | 'random' | 'npc'
  bookId: string
  bookName: string
  isWin: boolean
  score: number
  opponentScore: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  tipCount: number
  avgResponseTime: number
  wrongWords: Array<{wordId: string, word: string, isTip: boolean, responseTime: number}>
  startTime: string  // ISO格式的字符串
  endTime: string    // ISO格式的字符串
}): Promise<void> {
  console.log('🚀 recordCombatData 被调用', { options })

  // 调用云函数记录数据
  try {
    const result = await wx.cloud.callFunction({
      name: 'server',
      data: {
        url: 'learningData/recordCombat',
        combatId: options.combatId,
        combatType: options.combatType,
        bookId: options.bookId,
        bookName: options.bookName,
        isWin: options.isWin,
        score: options.score,
        opponentScore: options.opponentScore,
        totalQuestions: options.totalQuestions,
        correctCount: options.correctCount,
        wrongCount: options.wrongCount,
        tipCount: options.tipCount,
        avgResponseTime: options.avgResponseTime,
        wrongWords: options.wrongWords,
        startTime: options.startTime,
        endTime: options.endTime,
        duration: Math.floor((new Date(options.endTime).getTime() - new Date(options.startTime).getTime()) / 1000)
      }
    })
    
    // 检查云函数返回的 state 字段,0 表示成功
    // 使用类型断言确保 result.result 是对象类型
    const response = result.result as { state: number; data?: any }
    if (response?.state === 0) {
      console.log('✅ 对战数据记录成功', response)
    } else {
      console.warn('⚠️ 对战数据记录返回异常状态', response)
    }
  } catch (error) {
    console.error('❌ 对战数据记录失败:', error)
    // 不阻塞用户操作，静默失败
  }
}

/**
 * 记录词汇学习数据
 */
export async function recordLearningData(options: {
  bookId: string
  bookName: string
  startTime: string  // ISO格式的字符串
  endTime: string    // ISO格式的字符串
}): Promise<void> {
  console.log('🚀 recordLearningData 被调用', { options })

  const learning = store.$state.learning
  const user = store.$state.user

  if (!learning) {
    console.warn('⚠️ recordLearningData: learning 数据不存在')
    return
  }

  const { wordsIndex, score, healthPoint } = learning

  // 计算实际学习的单词数
  const resultCount = (learning.correctCount || 0) + (learning.wrongCount || 0)
  const wordsCount = Math.max(wordsIndex, resultCount)

  // 统计答题情况
  let correctCount = 0
  let wrongCount = 0
  let tipCount = 0
  const wrongWords: Array<{wordId: string, word: string, isTip: boolean, responseTime: number}> = (learning.wrongWords || []).map(item => ({
    wordId: item.wordId,
    word: item.word,
    isTip: false,
    responseTime: 0
  }))

  correctCount = learning.correctCount ?? score
  wrongCount = learning.wrongCount ?? (wordsCount - correctCount)
  tipCount = 0 // 需要从其他地方统计

  // 计算学习时长
  const duration = Math.floor((new Date(options.endTime).getTime() - new Date(options.startTime).getTime()) / 1000)

  // 获取历史最高分
  const maxScore = user.learning?.maxScore ?? 0

  // 是否使用了复活
  const reviveUsed = healthPoint < config.learningHealthPoint

  try {
    const result = await wx.cloud.callFunction({
      name: 'server',
      data: {
        url: 'learningData/recordLearning',
        bookId: options.bookId,
        bookName: options.bookName,
        score,
        maxScore,
        wordsCount,
        correctCount,
        wrongCount,
        tipCount,
        reviveUsed,
        wrongWords,
        startTime: options.startTime,
        endTime: options.endTime,
        duration
      }
    })
    
    // 检查云函数返回的 state 字段,0 表示成功
    // 使用类型断言确保 result.result 是对象类型
    const response = result.result as { state: number; data?: any }
    if (response?.state === 0) {
      console.log('✅ 学习数据记录成功', response)
    } else {
      console.warn('⚠️ 学习数据记录返回异常状态', response)
    }
  } catch (error) {
    console.error('❌ 学习数据记录失败:', error)
    // 不阻塞用户操作，静默失败
  }
}
