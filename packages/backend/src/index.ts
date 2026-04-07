import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Simple in-memory rate limiter (no extra dependency)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // requests per window
const RATE_WINDOW = 60000 // 1 minute

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

function sanitizeString(str: string | undefined, maxLength: number): string {
  if (!str) return ''
  return str.replace(/[<>"'`]/g, '').slice(0, maxLength)
}

// Initialize Anthropic client (optional - will use mock if no API key)
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ],
}))
app.use(express.json())

// Conversation history storage (in-memory for MVP)
const conversations = new Map<string, Array<{ role: string; content: string }>>()

app.post('/chat', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown'
  if (!rateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  try {
    const { message, sessionId = 'default', products = [], pageContext } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: 'Message must be a string under 2000 characters' })
    }

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [])
    }
    const history = conversations.get(sessionId)!

    history.push({ role: 'user', content: message })

    let response: string
    let targetProduct: string | null = null

    // Build page context string for system prompt
    const safeTitle = sanitizeString(pageContext?.pageTitle, 100)
    const safeUrl = sanitizeString(pageContext?.url, 200)
    const safeProducts = (pageContext?.visibleProducts || products || [])
      .slice(0, 20)
      .map((p: { id: string; name: string }) => ({
        id: sanitizeString(p.id, 50),
        name: sanitizeString(p.name, 100),
      }))

    const pageContextStr = pageContext
      ? `\n\nCurrent page: ${safeTitle} (${safeUrl})` +
        (safeProducts.length
          ? `\nVisible products on this page: ${safeProducts
              .map((p: { id: string; name: string }) => `${p.name} (id: ${p.id})`)
              .join(', ')}`
          : '')
      : products?.length > 0
      ? `\n\nAvailable products: ${(products as Array<{id: string; name: string}>).slice(0, 20).map((p) => `${sanitizeString(p.name, 100)} (id: ${sanitizeString(p.id, 50)})`).join(', ')}`
      : ''

    if (anthropic) {
      try {
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: `You are a friendly, concise AI sales assistant embedded on a website as a 3D avatar. You greet visitors, answer product questions, and help them find what they need. Keep responses under 3 sentences when possible — you are speaking as a voice/chat avatar, not writing an essay.${pageContextStr}

If the user asks about a specific product visible on this page, include in your response: TARGET_PRODUCT:[product_id]
Example: "These headphones are great for travel! TARGET_PRODUCT:headphones-001"`,
          messages: history.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        })

        response =
          claudeResponse.content[0].type === 'text'
            ? claudeResponse.content[0].text
            : 'I apologize, but I had trouble processing that request.'

        const targetMatch = response.match(/TARGET_PRODUCT:([\w-]+)/)
        if (targetMatch) {
          targetProduct = targetMatch[1]
          response = response.replace(/TARGET_PRODUCT:[\w-]+/g, '').trim()
        }
      } catch (error) {
        console.error('Claude API error:', error)
        response = "I'm having trouble connecting right now. Please try again in a moment."
      }
    } else {
      const mockResult = getMockResponse(message, pageContext?.visibleProducts || products)
      response = mockResult.response
      targetProduct = mockResult.targetProduct
    }

    history.push({ role: 'assistant', content: response })

    if (history.length > 10) {
      history.splice(0, history.length - 10)
    }

    res.json({ response, sessionId, targetProduct })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mock response generator for testing without API key
function getMockResponse(message: string, products: any[] = []): { response: string; targetProduct: string | null } {
  const lowerMessage = message.toLowerCase()
  let targetProduct: string | null = null

  // Check for product mentions
  for (const product of products) {
    if (lowerMessage.includes(product.name.toLowerCase()) || lowerMessage.includes(product.id)) {
      targetProduct = product.id
      break
    }
  }

  if (lowerMessage.includes('headphones') || lowerMessage.includes('headphone')) {
    targetProduct = 'headphones'
    return {
      response: "These wireless headphones are amazing! They have 30-hour battery life and premium noise cancellation. Perfect for music lovers and travelers.",
      targetProduct
    }
  }

  if (lowerMessage.includes('watch') || lowerMessage.includes('smartwatch')) {
    targetProduct = 'smartwatch'
    return {
      response: "The smart watch is one of our best sellers! It tracks your fitness, monitors your health, and keeps you connected. Great for an active lifestyle!",
      targetProduct
    }
  }

  if (lowerMessage.includes('mouse')) {
    targetProduct = 'mouse'
    return {
      response: "This wireless mouse has precision tracking and an ergonomic design. Perfect for both work and gaming!",
      targetProduct
    }
  }

  if (lowerMessage.includes('keyboard')) {
    targetProduct = 'keyboard'
    return {
      response: "Our mechanical keyboard features RGB backlighting and customizable switches. It's perfect for both typing and gaming!",
      targetProduct
    }
  }

  if (lowerMessage.includes('phone case') || lowerMessage.includes('case')) {
    targetProduct = 'phonecase'
    return {
      response: "This phone case offers military-grade protection with a sleek design. It'll keep your phone safe without adding bulk!",
      targetProduct
    }
  }

  if (lowerMessage.includes('laptop stand') || lowerMessage.includes('stand')) {
    targetProduct = 'laptopstand'
    return {
      response: "The laptop stand is ergonomically designed to improve your posture. Made from aluminum, it's both sturdy and stylish!",
      targetProduct
    }
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      response: "Hello! I can walk around and show you our products. Just ask me about any product or click on one!",
      targetProduct: null
    }
  }

  if (lowerMessage.includes('shipping')) {
    return {
      response: "We offer free standard shipping (5-7 days) and express shipping (2-3 days) for $9.99!",
      targetProduct: null
    }
  }

  if (lowerMessage.includes('return')) {
    return {
      response: "We have a 30-day return policy. Items must be unused and in original packaging. Returns are free and easy!",
      targetProduct: null
    }
  }

  return {
    response: "I'm here to help! Ask me about any of our products, or click on a product card to see me walk over to it!",
    targetProduct: null
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    anthropicEnabled: !!anthropic,
    message: anthropic ? 'Claude API connected' : 'Running in mock mode'
  })
})

app.listen(PORT, () => {
  console.log(`🤖 Avatar Widget Backend running on http://localhost:${PORT}`)
  console.log(`📡 Claude API: ${anthropic ? 'Connected' : 'Mock mode (set ANTHROPIC_API_KEY to enable)'}`)
})
