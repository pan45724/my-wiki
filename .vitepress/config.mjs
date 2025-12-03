import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "my-wiki",
  description: "wiki",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '文档', link: '/Gogs-Jenkins-docker-environment-build' }
    ],

    sidebar: [
      {
        text: '实战教程',
        items: [
          { text: 'Gogs、Jenkins、docker CI/CD 本地环境搭建', link: '/Gogs-Jenkins-docker-environment-build' },
          { text: 'windows openWrt旁路由搭建', link: '/Windows-Hyper-V-buile-OpenWrt-other-router' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pan45724/my-wiki' }
    ]
  }
})
