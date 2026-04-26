Component({
  options: {
    addGlobalClass: true,
  },
  properties: {
    activeScene: {
      type: String,
      value: "learning",
    },
    loading: {
      type: Boolean,
      value: false,
    },
    learningInsight: {
      type: Object,
      value: {},
    },
    battleInsight: {
      type: Object,
      value: {},
    },
    weakWords: {
      type: Array,
      value: [],
    },
    nextActions: {
      type: Array,
      value: [],
    },
  },
  methods: {
    onSwitchScene(event) {
      const scene = event.currentTarget.dataset.scene;
      this.triggerEvent("switchscene", { scene });
    },
    onGenerateLearning() {
      this.triggerEvent("generatelearning");
    },
    onGenerateBattle() {
      this.triggerEvent("generatebattle");
    },
    onStartWeakTraining() {
      this.triggerEvent("startweak");
    },
  },
});
