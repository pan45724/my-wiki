// .vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h } from 'vue'
import { useData } from 'vitepress'

// 广告位：内容与开关都在 config.mjs 的 themeConfig.ads 里，这里只负责渲染
const AdBanner = defineComponent({
  name: 'AdBanner',
  setup() {
    const { theme } = useData()
    return () => {
      const ads = theme.value?.ads
      if (!ads?.enabled) return null
      return h(
        'div',
        {
          style:
            'padding:10px;background:var(--vp-c-bg-soft);border-radius:8px;margin-bottom:20px;text-align:center;font-size:14px;'
        },
        [
          ads.text,
          h(
            'a',
            {
              href: ads.link,
              target: '_blank',
              rel: 'noopener sponsored',
              style: 'color:var(--vp-c-brand-1);font-weight:500;margin-left:5px;'
            },
            ads.linkText
          )
        ]
      )
    }
  }
})

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // doc-before 只在文章页生效，首页不会出现广告
      'doc-before': () => h(AdBanner)
    })
  }
}
