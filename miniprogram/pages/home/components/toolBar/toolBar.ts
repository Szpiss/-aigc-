import { toast } from './../../../../utils/util'

App.Component({
  methods: {
    onSelectBook () {
      const page = getCurrentPages()
      const bookSelect = (page[page.length - 1]?.selectComponent('#book-select'))
      bookSelect?.show()
    },
    onTipCard () {
      void toast.show('可用于「对战模式」和「词汇学习」助力选择', 0, 640)
    }
  }
})
