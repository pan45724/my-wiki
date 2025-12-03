// .vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './custom.css' // 如果你想写样式

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // 'doc-before' 插槽的意思是：在文章内容开始之前
      'doc-before': () => h('div', { 
          style: 'padding: 10px; background: #f9f9f9; border-radius: 5px; margin-bottom: 20px; text-align: center; font-size: 14px;' 
        }, [
          '📢 广告：域名还没买？',
          h('a', { 
            href: 'https://www.namesilo.com/?rid=你的推荐ID', 
            target: '_blank',
            style: 'color: #3eaf7c; font-weight: bold; margin-left: 5px;'
          }, '去 NameSilo 注册，首年 $1 起！')
        ])
    })
  }
}