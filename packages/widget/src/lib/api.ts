import { PageContext } from '../hooks/usePageContext'

export interface ChatRequest {
  message: string
  sessionId: string
  pageContext: PageContext
}

export interface ChatResponse {
  response: string
  sessionId: string
  targetProduct: string | null
}

export async function postChat(
  apiEndpoint: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    throw new Error(`Chat API error: ${res.status}`)
  }
  return res.json()
}

export function generateSessionId(): string {
  return 'visitor-' + Math.random().toString(36).slice(2, 11)
}
