/** 自绘导航栏:原生标题字号/字体不可定制,全局 navigationStyle:custom 后用它 */
Component({
  properties: { title: String, back: { type: Boolean, value: false } },
  data: { sb: 20, h: 44 },
  lifetimes: {
    attached() {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      let h = 44;
      try {
        const mb = wx.getMenuButtonBoundingClientRect();
        h = (mb.top - info.statusBarHeight) * 2 + mb.height; // 与右上胶囊垂直居中对齐
      } catch (e) { /* 取不到就用默认 44 */ }
      this.setData({ sb: info.statusBarHeight || 20, h });
    },
  },
  methods: { goBack() { wx.navigateBack({ delta: 1 }); } },
});
