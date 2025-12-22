import Head from 'next/head'
import { useMemo } from 'react'

const featureList = [
  { title: '离线题库', body: '将常用题库完整打包，断网环境也能秒开。' },
  { title: '极速更新', body: '一键替换压缩包即可升级，无需重新部署。' },
  { title: '隐私守护', body: '本地运行不上传任何学习数据，安心复习。' }
]

const badges = ['Beta 1.0', '兼容 Win / macOS', '文件大小 < 10 MB']
const downloadDisabled = true

export default function DownloadAppPage() {
  const renderedFeatures = useMemo(() => featureList.map((item) => (
    <li key={item.title} className="download-feature">
      <span className="feature-pill" />
      <div>
        <p className="feature-title">{item.title}</p>
        <p className="feature-body">{item.body}</p>
      </div>
    </li>
  )), [])

  function handleDownload() {
    if (downloadDisabled) return
    const link = document.createElement('a')
    link.href = '/app.zip'
    link.download = 'app.zip'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <>
      <Head>
        <title>下载题库 App</title>
        <meta name="description" content="下载线下可用的题库 App，随时随地复习。" />
      </Head>
      <div className="download-app-page">
        <div className="download-aurora download-aurora-one" aria-hidden="true" />
        <div className="download-aurora download-aurora-two" aria-hidden="true" />
        <section className="download-shell">
          <div className="download-card">
            <div className="badge-row">
              {badges.map(text => (
                <span key={text} className="download-badge">{text}</span>
              ))}
            </div>
            <h1>题库 App · 离线下载</h1>
            <p className="download-lede">
              将整个题库装进口袋。点击一次即可下载 app.zip，解压后直接运行，无需联网即可检索所有试题。
            </p>
            <div className="cta-row">
              <button className="download-cta" onClick={handleDownload} disabled={downloadDisabled} aria-disabled={downloadDisabled}>
                <span>立即下载 app.zip</span>
              </button>
              <a
                className={`download-secondary-link${downloadDisabled ? ' disabled' : ''}`}
                href={downloadDisabled ? undefined : '/app.zip'}
                download={downloadDisabled ? undefined : true}
                onClick={downloadDisabled ? (e) => e.preventDefault() : undefined}
                aria-disabled={downloadDisabled}
                tabIndex={downloadDisabled ? -1 : undefined}
              >
                备用链接
              </a>
              {downloadDisabled && (
                <p className="download-note">下载通道暂时关闭，如需获取最新 app.zip 请稍后再试或联系维护同学。</p>
              )}
            </div>
            <ul className="download-feature-list">
              {renderedFeatures}
            </ul>
          </div>
          <aside className="download-hero" aria-label="App 预览示意">
            <div className="hero-frame">
              <div className="hero-rings" />
              <div className="hero-core">
                <p>离线检索</p>
                <p>深色模式</p>
                <p>快速定位</p>
              </div>
              <div className="hero-glow" />
            </div>
          </aside>
        </section>
      </div>
    </>
  )
}
