import Head from 'next/head'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const handleStart = () => setIsTransitioning(true)
    const handleComplete = () => setIsTransitioning(false)

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={`page-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
        <Component {...pageProps} />
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
