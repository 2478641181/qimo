export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb'
    }
  }
}

let cachedToken = null
let cachedExpire = 0

const getAccessToken = async () => {
  const now = Date.now()
  if (cachedToken && cachedExpire > now + 60_000) return cachedToken

  const ak = process.env.BAIDU_OCR_AK || process.env.OCR_API_KEY || 'QBaVv1JJVW9zs0LX6R8uujkl'
  const sk = process.env.BAIDU_OCR_SK || process.env.OCR_API_SECRET || '9y82z2kZsbSUp2vmlCYfD7XC9XkOj3Zp'
  if (!ak || !sk) throw new Error('缺少百度 OCR AK/SK 配置')

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ak,
    client_secret: sk
  })

  const resp = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })

  const data = await resp.json()
  if (!resp.ok || !data?.access_token) {
    throw new Error(data?.error_description || '获取百度 OCR Token 失败')
  }

  cachedToken = data.access_token
  const expiresIn = Number(data.expires_in || 0) * 1000
  cachedExpire = now + Math.max(expiresIn, 0)
  return cachedToken
}

const toBaiduPayload = (base64) => {
  const params = new URLSearchParams()
  params.append('image', base64)
  params.append('language_type', 'CHN_ENG')
  params.append('detect_direction', 'true')
  params.append('paragraph', 'false')
  params.append('probability', 'false')
  return params
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { imageBase64 } = req.body || {}
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: '缺少待识别的图片数据' })
  }

  try {
    const token = await getAccessToken()
    const payload = toBaiduPayload(imageBase64)
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    })

    const data = await resp.json()
    if (!resp.ok || data?.error_code) {
      throw new Error(data?.error_msg || '百度 OCR 调用失败')
    }

    const parsed = (data?.words_result || [])
      .map((r) => r?.words || '')
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!parsed) throw new Error('OCR 未返回有效文本')

    res.status(200).json({ success: true, text: parsed })
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'OCR 识别失败' })
  }
}
