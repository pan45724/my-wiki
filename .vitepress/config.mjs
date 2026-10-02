import { defineConfig } from 'vitepress'

// ── 站点级配置：想改名字 / 域名 / 邮箱，只改这里 ──────────────
const REPO = 'https://github.com/pan45724/my-wiki'
const EMAIL = 'admin@475462.xyz'
const HOSTNAME = 'https://882299.xyz'

export default defineConfig({
  lang: 'zh-CN',
  title: 'my-wiki',
  description: '后端架构、团队管理与 AI 落地的实战笔记',

  // 最后更新时间取自 git 提交记录，不需要手写日期
  lastUpdated: true,

  // README.md 是给 GitHub 看的，不要渲染成站点页面；_drafts/ 下是草稿
  srcExclude: ['README.md', '**/_drafts/**'],

  sitemap: { hostname: HOSTNAME },
  markdown: { lineNumbers: true },

  // 把 frontmatter 里的 description 注入成 <meta name="description">
  transformPageData(pageData) {
    const description = pageData.frontmatter.description
    if (!description) return
    if (!pageData.frontmatter.head) pageData.frontmatter.head = []
    pageData.frontmatter.head.push([
      'meta',
      { name: 'description', content: description }
    ])
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      {
        text: '实战笔记',
        items: [
          { text: '运维与 CI/CD', link: '/posts/cicd/gogs-jenkins-docker' },
          { text: '网络与路由', link: '/posts/network/openwrt-hyperv-router' },
          { text: 'AI 自建服务', link: '/posts/ai/zero-cost-ai-gateway' },
          { text: '网站搭建', link: '/posts/devops/vitepress-cloudflare-pages' }
        ]
      },
      { text: '软考刷题', link: '/posts/tools/pmp-quiz' },
      { text: '关于我', link: '/about' },
      { text: '联系', link: `mailto:${EMAIL}` }
    ],

    sidebar: [
      {
        text: '运维与 CI/CD',
        items: [
          { text: '本地 Java CI/CD 环境搭建', link: '/posts/cicd/gogs-jenkins-docker' }
        ]
      },
      {
        text: '网络与路由',
        items: [
          { text: 'Hyper-V 部署 OpenWrt 旁路由', link: '/posts/network/openwrt-hyperv-router' }
        ]
      },
      {
        text: 'AI 自建服务',
        items: [
          { text: '零成本全栈 AI 代理站', link: '/posts/ai/zero-cost-ai-gateway' },
          { text: 'LobeChat 全栈部署', link: '/posts/ai/lobechat-fullstack-deploy' }
        ]
      },
      {
        text: '网站搭建',
        items: [
          { text: 'VitePress + Cloudflare Pages', link: '/posts/devops/vitepress-cloudflare-pages' }
        ]
      },
      {
        text: '自制工具',
        items: [
          { text: '软考刷题平台', link: '/posts/tools/pmp-quiz' }
        ]
      },
      {
        text: '变现与引流',
        collapsed: true,
        items: [
          { text: '数码维修变现路线', link: '/posts/biz/repair-monetization' }
        ]
      }
    ],

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' }
    },
    editLink: {
      pattern: `${REPO}/edit/main/:path`,
      text: '在 GitHub 上编辑此页'
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: REPO }],

    footer: {
      message: '基于 VitePress 构建 · 内容按实际操作过程整理',
      copyright: 'Copyright © 2025-present pan45724'
    },

    // 广告位：enabled 改成 true 才会显示，只出现在文章页、不影响首页
    ads: {
      enabled: false,
      text: '域名还没买？',
      link: 'https://www.namesilo.com/?rid=dcb5c45jv',
      linkText: '去 NameSilo 注册，首年 $1 起！'
    }
  }
})
