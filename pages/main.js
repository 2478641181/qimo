import { useEffect, useMemo, useRef, useState } from 'react'

const MIN_TOKEN_LENGTH = 2

const splitQuestionsFromText = (raw = '') => {
  if (!raw) return []
  const lines = raw.replace(/\r/g, '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const chunks = []
  let buf = []

  const flush = () => {
    if (buf.length) {
      const joined = buf.join(' ').trim()
      if (joined.length > 4) chunks.push(joined)
      buf = []
    }
  }

  lines.forEach((line) => {
    const cleaned = line.replace(/^\d{1,3}[\.．、]\s*/, '')
    if (/^\d{1,3}[\.．、]/.test(line) && buf.length) {
      flush()
    }
    buf.push(cleaned)
  })
  flush()
  return chunks
}

const tokenize = (text = '') => text
  .toLowerCase()
  .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
  .map((t) => t.trim())
  .filter((t) => t.length >= MIN_TOKEN_LENGTH)

const scoreItemForQuery = (item, tokens = []) => {
  if (!item || !tokens.length) return 0
  const title = (item.titleText || item.title || item.question || '').toString().toLowerCase()
  const answer = (item.analysis || item.answer || '').toString().toLowerCase()
  return tokens.reduce((acc, t) => {
    let score = acc
    if (title.includes(t)) score += 2
    if (answer.includes(t)) score += 1
    return score
  }, 0)
}

const pickTopMatches = (items = [], text = '', limit = 3) => {
  const tokens = tokenize(text).slice(0, 10)
  if (!tokens.length) return []
  return items
    .map((it) => ({ item: it, score: scoreItemForQuery(it, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item)
}

export default function MainPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState('')
  const [showSupport, setShowSupport] = useState(true)
  const isMobile = useMobileUA()
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)

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

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const lower = q.toLowerCase()
  const results = useMemo(() => items.filter((it) => {
    const title = (it.title || it.titleText || it.question || '').toString().toLowerCase()
    const answer = (it.answer || it.answerText || it.analysis || '').toString().toLowerCase()
    return title.includes(lower) || answer.includes(lower)
  }), [items, lower])

  const ocrMatches = useMemo(() => pickTopMatches(items, ocrText, 5), [items, ocrText])

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0]
    if (!file) return
    setSelectedFile(file)
    runOcr(file, file.type)
  }

  const runOcr = (fileOrDataUrl, mimeOverride) => {
    if (!fileOrDataUrl) {
      setOcrError('请先选择图片或拍照')
      return
    }
    setOcrError('')

    const handleBase64 = async (dataUrl) => {
      const base64 = (dataUrl || '').toString().replace(/^data:.*;base64,/, '')
      if (!base64) {
        setOcrError('读取图片失败，请重试')
        return
      }
      setOcrLoading(true)
      try {
        const resp = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: mimeOverride || 'image/jpeg' })
        })
        const data = await resp.json()
        if (!resp.ok || !data?.text) throw new Error(data?.error || 'OCR 识别失败')
        setOcrText(data.text)
      } catch (err) {
        setOcrError(err?.message || 'OCR 识别失败，请稍后再试')
      } finally {
        setOcrLoading(false)
      }
    }

    if (typeof fileOrDataUrl === 'string') {
      handleBase64(fileOrDataUrl)
      return
    }

    const reader = new FileReader()
    reader.onload = () => handleBase64(reader.result)
    reader.readAsDataURL(fileOrDataUrl)
  }

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const startCamera = async () => {
    try {
      setCamError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError('当前浏览器不支持摄像头调用。')
        return
      }
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraOn(true)
      }
    } catch (err) {
      setCamError('无法访问摄像头，请检查权限或设备。')
      setCameraOn(false)
    }
  }

  const captureAndOcr = () => {
    if (!cameraOn || !videoRef.current) {
      setCamError('请先打开摄像头')
      return
    }
    setCamError('')
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCamError('无法读取摄像头画面')
      return
    }
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/png')
    runOcr(dataUrl, 'image/png')
  }

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
            placeholder={isMobile ? '输入关键词搜索...' : '输入关键词，例如 "JS"'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>

      <section className="ocr-section" aria-label="OCR 搜题">
        <div className="ocr-left">
          <div className="ocr-actions">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="ocr-btn" onClick={triggerFileSelect} aria-label="上传图片进行 OCR">
              {selectedFile ? '更换图片' : '上传图片 OCR'}
            </button>
            <button className="ocr-btn ghost" onClick={startCamera} disabled={ocrLoading}>
              打开摄像头
            </button>
            <button className="ocr-btn ghost" onClick={captureAndOcr} disabled={ocrLoading}>
              拍照搜题
            </button>
            <button className="ocr-btn ghost" onClick={stopCamera} disabled={!cameraOn}>
              关闭摄像头
            </button>
          </div>

          <div className="ocr-camera">
            <video ref={videoRef} className={`ocr-video ${cameraOn ? 'active' : ''}`} autoPlay playsInline muted />
            {!cameraOn && <p className="ocr-hint">点击“打开摄像头”以实时取景，随后“拍照搜题”自动识别。</p>}
          </div>
          {ocrError && <p className="ocr-error" role="alert">{ocrError}</p>}
          {camError && <p className="ocr-error" role="alert">{camError}</p>}
          <p className="ocr-hint">拍照或上传后自动识别全文，直接给出最匹配的题库项。</p>
        </div>

        <div className="ocr-right" aria-live="polite">
          {ocrMatches.length === 0 && <p className="ocr-empty">暂无 OCR 结果，上传或拍照即可自动匹配题库。</p>}
          {ocrMatches.length > 0 && (
            <article className="ocr-result-card">
              <header className="ocr-result-header">
                <span className="ocr-question-index">★</span>
                <span className="ocr-question">OCR 最匹配结果</span>
              </header>
              <div className="ocr-match-list">
                {ocrMatches.map((m, mIdx) => (
                  <div key={`${m.id || mIdx}`} className="ocr-match">
                    <div className="ocr-match-title">{renderWithAnswers(m.titleText || m.title || m.question, m.analysis)}</div>
                    {m.bank && <span className="ocr-bank">{m.bank}</span>}
                  </div>
                ))}
              </div>
            </article>
          )}
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

      <button className="floating-support-btn" onClick={() => setShowSupport(true)} aria-label="支持我们">
        ❤️
      </button>

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
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div className={`support-modal ${isClosing ? 'closing' : ''}`} role="dialog" aria-modal="true">
      <div className="support-overlay" onClick={handleClose} />
      <div className="support-content">
        <button className="support-close" onClick={handleClose}>×</button>
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
