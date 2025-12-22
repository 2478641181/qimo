import { useState, useMemo, useEffect } from 'react'

export default function Home() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [showSupport, setShowSupport] = useState(false)

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
    <div className="container">
      <header className="header">
        <h1>题库展示</h1>
        <input className="search" placeholder="搜索题目或答案" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="support-btn" onClick={() => setShowSupport(true)} aria-label="支持我们">支持我们</button>
      </header>

      <main className="list">
        {results.map((it, idx) => (
          <article key={it.id || idx} className="card">
            <div className="q">
              {it.titleText || it.title || it.question ? (
                <div className="question-text">{renderWithAnswers(it.titleText || it.title || it.question, it.analysis)}</div>
              ) : (
                <h2>题目 {idx + 1}</h2>
              )}
            </div>

            {/* 答案已内嵌到题目中（通过 <fillblank/> 占位替换），不再重复在下方显示 */}
          </article>
        ))}
        {results.length === 0 && <p className="empty">未找到匹配项</p>}
      </main>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
    </div>
  )
}

// 支持弹窗置于组件末尾
function SupportModal({ onClose }){
  return (
    <div className="support-modal" role="dialog" aria-modal="true">
      <div className="support-overlay" onClick={onClose} />
      <div className="support-content">
        <button className="support-close" onClick={onClose}>×</button>
        <h3>感谢你的支持 ❤️</h3>
        <p>请点击图片在新窗口中查看或保存（图片由后端提供）。</p>
        <div className="support-image-wrap">
          <img src="/api/support-image" alt="支持我们图片" onClick={() => window.open('/api/support-image', '_blank')} style={{cursor:'pointer'}} />
        </div>
        <p className="muted">你也可以把这个仓库 Star 或部署到 Vercel 支持我们。</p>
      </div>
    </div>
  )
}


