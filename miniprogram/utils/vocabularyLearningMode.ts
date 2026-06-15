import { store } from './../app'

export type VocabularyLearningMode = 'recognition' | 'choice'

export const VOCABULARY_LEARNING_MODE_STORAGE_KEY = 'vocabularyLearningMode'

export const vocabularyLearningModeOptions: Array<{
  label: string
  value: VocabularyLearningMode
  desc: string
}> = [
  {
    label: '认识 / 不认识',
    value: 'recognition',
    desc: '快速过词，适合复习和筛出生词'
  },
  {
    label: '选项练习',
    value: 'choice',
    desc: '通过选择正确释义巩固记忆'
  }
]

export const normalizeVocabularyLearningMode = (mode?: string): VocabularyLearningMode => {
  return mode === 'recognition' ? 'recognition' : 'choice'
}

export const getVocabularyLearningModeLabel = (mode: VocabularyLearningMode): string => {
  const option = vocabularyLearningModeOptions.find(item => item.value === mode)
  return option?.label ?? '选项练习'
}

export const getVocabularyLearningModeDesc = (mode: VocabularyLearningMode): string => {
  const option = vocabularyLearningModeOptions.find(item => item.value === mode)
  return option?.desc ?? '通过选择正确释义巩固记忆'
}

export const getVocabularyLearningMode = (): VocabularyLearningMode => {
  const storageMode = wx.getStorageSync(VOCABULARY_LEARNING_MODE_STORAGE_KEY) as string | undefined
  if (storageMode) {
    return normalizeVocabularyLearningMode(storageMode)
  }

  const cloudMode = store.$state.user?.config?.vocabularyLearningMode
  return normalizeVocabularyLearningMode(cloudMode)
}

export const setVocabularyLearningMode = (mode: VocabularyLearningMode): VocabularyLearningMode => {
  const nextMode = normalizeVocabularyLearningMode(mode)
  wx.setStorageSync(VOCABULARY_LEARNING_MODE_STORAGE_KEY, nextMode)

  if (store.$state.user?._openid) {
    store.setState({
      user: {
        ...store.$state.user,
        config: {
          ...store.$state.user.config,
          vocabularyLearningMode: nextMode
        }
      }
    })
  }

  return nextMode
}
