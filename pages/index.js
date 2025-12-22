import { useState, useMemo } from 'react'
import fs from 'fs'
import path from 'path'

export default function Home({ items }) {
  const [q, setQ] = useState('')
  const lower = q.toLowerCase()
  const results = useMemo(() => items.filter((it) => {
    const title = (it.title || it.question || '').toString().toLowerCase()
    const answer = (it.answer || it.answerText || '').toString().toLowerCase()
    return title.includes(lower) || answer.includes(lower)
  }), [items, lower])

  return (
    <div className="container">
      <h1>题库展示</h1>
      <input className="search" placeholder="搜索题目或答案" value={q} onChange={(e)=>setQ(e.target.value)} />
      <div className="list">
        {results.map((it, idx) => (
          <div key={idx} className="card">
            <h2>{it.title || it.question || `题目 ${idx+1}`}</h2>
            <pre className="answer">{it.answer || it.answerText || '无答案'}</pre>
          </div>
        ))}
        {results.length === 0 && <p>未找到匹配项</p>}
      </div>
    </div>
  )
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'data.json')
  let data = []
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    data = JSON.parse(raw)
    if (!Array.isArray(data)) data = Object.values(data)
  } catch (e) {
    data = []
  }
  return { props: { items: data } }
}
