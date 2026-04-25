import {
  getVocabularyLearningMode,
  getVocabularyLearningModeDesc,
  getVocabularyLearningModeLabel,
  setVocabularyLearningMode,
  vocabularyLearningModeOptions
} from './../../../../utils/vocabularyLearningMode'

App.Component({
  options: {
    addGlobalClass: true
  },
  data: {
    modeLabel: getVocabularyLearningModeLabel('choice'),
    modeDesc: getVocabularyLearningModeDesc('choice')
  },
  lifetimes: {
    ready () {
      this.refreshMode()
    }
  },
  pageLifetimes: {
    show () {
      this.refreshMode()
    }
  },
  methods: {
    refreshMode () {
      const mode = getVocabularyLearningMode()
      this.setData({
        modeLabel: getVocabularyLearningModeLabel(mode),
        modeDesc: getVocabularyLearningModeDesc(mode)
      })
    },
    onSwitchMode () {
      wx.showActionSheet({
        itemList: vocabularyLearningModeOptions.map(item => item.label),
        success: (res) => {
          const selected = vocabularyLearningModeOptions[res.tapIndex]
          if (!selected) { return }

          setVocabularyLearningMode(selected.value)
          this.refreshMode()
          void wx.showToast({
            title: `已切换为${selected.label}`,
            icon: 'none',
            duration: 1200
          })
        }
      })
    }
  }
})
