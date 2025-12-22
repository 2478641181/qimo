import { useState, useMemo, useEffect } from 'react'

export default function MainPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [showSupport, setShowSupport] = useState(false)
  const isMobile = useMobileUA()

  useEffect(() => {
    let mounted = true
    fetch('/api/questions')
      .then(r => r.json())
      .then(d => {
        if (!mounted) return
        if (d && d.items) setItems(d.items)
      }).catch(() => {})

    return () => { mounted = false }
  }, [])

  const lower = q.toLowerCase()
  const results = useMemo(() => items.filter((it) => {
    const title = (it.title || it.titleText || it.question || '').toString().toLowerCase()
    const answer = (it.answer || it.answerText || it.analysis || '').toString().toLowerCase()
    return title.includes(lower) || answer.includes(lower)
  }), [items, lower])

  function renderWithAnswers(titleText = '', analysis = '') {
    const parts = titleText.split('<fillblank/>')
    const answers = (analysis || '').split(',').map(s => s.trim())

    return parts.map((p, i) => (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: p }} />
        {i < parts.length - 1 && (
          <span className="inline-answer">{answers[i] || '____'}</span>
        )}
      </span>
    ))
  }

  return (
    <div className={`main-page ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <div className="main-glow main-glow-one" aria-hidden="true" />
      <div className="main-glow main-glow-two" aria-hidden="true" />

      <section className="main-hero" aria-labelledby="main-hero-title">
        <p className="main-eyebrow">题库中心</p>
        <h1 id="main-hero-title">即时检索，沉浸刷题</h1>
        <p className="main-description">利用关键词秒搜题目，填空题自动呈现答案，配合离线 App 备份，打造全程沉浸的刷题体验。</p>
        <div className="main-controls">
          <input
            className="main-search"
            placeholder={'输入关键词，例如 "JS"'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="main-support-btn" onClick={() => setShowSupport(true)} aria-label="支持我们">支持我们</button>
        </div>
      </section>

      <main className="main-list">
        {results.map((it, idx) => (
          <article key={it.id || idx} className="main-card">
            <div className="q">
              <div className="question-meta">
                <span className="question-bank-badge" aria-label="题库来源">
                  {it.bank || '默认题库'}
                </span>
              </div>
              {it.titleText || it.title || it.question ? (
                <div className="question-text">{renderWithAnswers(it.titleText || it.title || it.question, it.analysis)}</div>
              ) : (
                <h2>题目 {idx + 1}</h2>
              )}
            </div>
          </article>
        ))}
      </main>
      {results.length === 0 && <p className="empty">未找到匹配项</p>}

      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  )
}

function useMobileUA() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent || ''
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
  }, [])

  return isMobile
}

function SupportModal({ onClose }) {
  return (
    <div className="support-modal" role="dialog" aria-modal="true">
      <div className="support-overlay" onClick={onClose} />
      <div className="support-content">
        <button className="support-close" onClick={onClose}>×</button>
        <h3>感谢你的支持 ❤️</h3>
        <p>请点击图片在新窗口中查看或保存。</p>
        <div className="support-image-wrap">
          <img src="/api/support-image" alt="支持我们图片" onClick={() => window.open('/api/support-image', '_blank')} style={{ cursor: 'pointer' }} />
        </div>
        <p className="muted">你也可以把这个仓库 Star 或部署到 Vercel 支持我们。</p>

        <div className="support-actions">
          <a className="github-link" href="https://github.com/2478641181/qimo" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span>查看仓库</span>
          </a>
        </div>
      </div>
    </div>
  )
}
