const navCards = [
  {
    title: '题库模式',
    description: '即时检索题目、填空自动补齐、关键词高亮展示。',
    href: '/main',
    icon: '→'
  },
  {
    title: '离线 App',
    description: '下载 app.zip，离线场景也能完整访问题库。',
    href: '/app',
    icon: '⇩'
  }
]

const stats = [
  { value: '38', label: '题目覆盖' },
  { value: '60s', label: '部署上手' },
  { value: '0¥', label: '完全免费' }
]

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-aurora landing-aurora-one" aria-hidden="true" />
        <div className="landing-aurora landing-aurora-two" aria-hidden="true" />
        <div className="landing-hero-card">
          <p className="landing-eyebrow">导航</p>
          <h1 id="landing-hero-title">刷题或下载，一键抵达。</h1>
          <p className="landing-lede">线上实时检索、离线极速访问——将题库掌控在手，随时进入最合适的学习模式。</p>
          <div className="landing-actions">
            <a className="landing-btn primary" href="/main">进入题库</a>
            <a className="landing-btn ghost" href="/app" rel="noopener noreferrer">下载 App</a>
          </div>

          <div className="landing-nav-grid">
            {navCards.map(card => (
              <a key={card.title} className="landing-nav-card" href={card.href}>
                <span className="landing-nav-label">{card.title}</span>
                <p>{card.description}</p>
                <span className="nav-arrow" aria-hidden="true">{card.icon}</span>
              </a>
            ))}
          </div>

          <div className="landing-stats">
            {stats.map(stat => (
              <div key={stat.label} className="landing-stat">
                <span className="landing-stat-value">{stat.value}</span>
                <span className="landing-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


