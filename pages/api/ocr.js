export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb'
    }
  }
}

const buildImageDataUrl = (base64, mimeType = 'image/jpeg') => {
  if (!base64) return null
  if (base64.startsWith('data:')) return base64
  return `data:${mimeType};base64,${base64}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { imageBase64, mimeType } = req.body || {}
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: '缺少待识别的图片数据' })
  }

  const endpoint = process.env.OCR_API_URL || 'https://api.ocr.space/parse/image'
  const apiKey = process.env.OCR_API_KEY || 'helloworld' // 免费测试 key，生产建议自行配置
  const payload = new URLSearchParams()
  const imgData = buildImageDataUrl(imageBase64, mimeType)

  payload.append('apikey', apiKey)
  payload.append('language', 'chs')
  payload.append('isOverlayRequired', 'false')
  payload.append('OCREngine', '2')
  payload.append('base64Image', imgData)

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    })

    const data = await resp.json()
    if (!resp.ok) {
      const message = data?.ErrorMessage || 'OCR 服务调用失败'
      throw new Error(Array.isArray(message) ? message.join('; ') : message)
    }

    const parsed = (data?.ParsedResults || [])
      .map((r) => r?.ParsedText || '')
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!parsed) {
      throw new Error('OCR 未返回有效文本')
    }

    res.status(200).json({ success: true, text: parsed })
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || 'OCR 识别失败' })
  }
}
