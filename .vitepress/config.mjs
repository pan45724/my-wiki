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
          { text: '零成本全栈 AI 代理网站搭建', link: '/Free-AI-Website-For-Agents.md' },
          { text: '文档管理', link: '/wiki-manage.md' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pan45724/my-wiki' }
    ],
    search: {
      provider: 'local'
    },
    sitemap: {
      hostname: 'https://882299.xyz'
    }
  }
})
