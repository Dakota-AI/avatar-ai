import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Product {
  id: string
  name: string
  x: number
  y: number
}

interface Avatar2DWidgetProps {
  apiEndpoint?: string
  initialMessage?: string
}

export function Avatar2DWidget({
  apiEndpoint = 'http://localhost:3001/chat',
  initialMessage = "Hi! I'm here to help. Click on any product and I'll walk over to explain it!"
}: Avatar2DWidgetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState(initialMessage)
  const [isTalking, setIsTalking] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Avatar position and movement
  const [avatarPosition, setAvatarPosition] = useState({ x: 100, y: window.innerHeight - 200 })
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null)
  const [isWalking, setIsWalking] = useState(false)
  const [facingLeft, setFacingLeft] = useState(false)

  // Product tracking
  const [products, setProducts] = useState<Product[]>([])
  const animationFrameRef = useRef<number>()

  // Detect products on the page
  useEffect(() => {
    if (!isVisible) return

    const detectProducts = () => {
      const productElements = document.querySelectorAll('[data-product-id]')
      const detectedProducts: Product[] = []

      productElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        const productId = element.getAttribute('data-product-id')
        const productName = element.getAttribute('data-product-name') || productId

        if (productId) {
          detectedProducts.push({
            id: productId,
            name: productName,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          })
        }
      })

      setProducts(detectedProducts)
    }

    detectProducts()
    window.addEventListener('resize', detectProducts)
    window.addEventListener('scroll', detectProducts)

    return () => {
      window.removeEventListener('resize', detectProducts)
      window.removeEventListener('scroll', detectProducts)
    }
  }, [isVisible])

  // Movement animation
  useEffect(() => {
    if (!targetPosition) {
      setIsWalking(false)
      return
    }

    setIsWalking(true)

    const animate = () => {
      setAvatarPosition((current) => {
        const dx = targetPosition.x - current.x
        const dy = targetPosition.y - current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 5) {
          setTargetPosition(null)
          setIsWalking(false)
          return current
        }

        // Set facing direction
        if (dx < -10) setFacingLeft(true)
        else if (dx > 10) setFacingLeft(false)

        const speed = 3
        const moveX = (dx / distance) * speed
        const moveY = (dy / distance) * speed

        return {
          x: current.x + moveX,
          y: current.y + moveY
        }
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [targetPosition])

  // Initial greeting
  useEffect(() => {
    if (isVisible && !messages.length) {
      setTimeout(() => {
        setCurrentMessage(initialMessage)
        setIsTalking(true)
        setTimeout(() => setIsTalking(false), 3000)
      }, 500)
    }
  }, [isVisible, messages.length, initialMessage])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = { role: 'user', content }
    setMessages((prev) => [...prev, userMessage])
    setCurrentMessage(`You: ${content}`)
    setInputValue('')
    setIsTyping(true)
    setIsTalking(false)

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          products: products.map((p) => ({ id: p.id, name: p.name }))
        })
      })

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "I'm here to help!"
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Check if response indicates a product target
      if (data.targetProduct) {
        const targetProd = products.find((p) => p.id === data.targetProduct)
        if (targetProd) {
          // Walk to product before speaking
          setTargetPosition({ x: targetProd.x - 100, y: targetProd.y + 50 })

          setTimeout(() => {
            setIsTyping(false)
            setCurrentMessage(assistantMessage.content)
            setIsTalking(true)
            setTimeout(() => setIsTalking(false), Math.min(assistantMessage.content.length * 30, 4000))
          }, 1500) // Wait for walk animation
        } else {
          showResponse(assistantMessage)
        }
      } else {
        showResponse(assistantMessage)
      }
    } catch (error) {
      const fallbackMessage: Message = {
        role: 'assistant',
        content: "I'm here to help! How can I assist you today?"
      }
      setMessages((prev) => [...prev, fallbackMessage])
      showResponse(fallbackMessage)
    }
  }

  const showResponse = (message: Message) => {
    setIsTyping(false)
    setCurrentMessage(message.content)
    setIsTalking(true)
    setTimeout(() => setIsTalking(false), Math.min(message.content.length * 30, 4000))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  // Click on products to make avatar walk there
  useEffect(() => {
    if (!isVisible) return

    const handleProductClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const productCard = target.closest('[data-product-id]')

      if (productCard) {
        const rect = productCard.getBoundingClientRect()
        const productName = productCard.getAttribute('data-product-name') || 'this product'

        setTargetPosition({
          x: rect.left + rect.width / 2 - 100,
          y: rect.top + rect.height / 2 + 50
        })

        setTimeout(() => {
          setCurrentMessage(`Let me tell you about ${productName}!`)
          setIsTalking(true)
          setTimeout(() => setIsTalking(false), 2000)
        }, 1500)
      }
    }

    document.addEventListener('click', handleProductClick)
    return () => document.removeEventListener('click', handleProductClick)
  }, [isVisible])

  if (!isVisible) {
    return (
      <button
        onClick={() => {
          console.log('Button clicked!')
          setIsVisible(true)
        }}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#667eea',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
          fontSize: '30px',
          color: 'white',
          zIndex: 999999,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
          console.log('Mouse enter button')
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        👋
      </button>
    )
  }

  return (
    <>
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: 'fixed',
          right: '20px',
          top: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'white',
          border: '2px solid #667eea',
          cursor: 'pointer',
          fontSize: '24px',
          color: '#667eea',
          zIndex: 10002,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}
      >
        ×
      </button>

      {/* 2D Avatar Character */}
      <div
        style={{
          position: 'fixed',
          left: `${avatarPosition.x}px`,
          top: `${avatarPosition.y}px`,
          width: '120px',
          height: '180px',
          zIndex: 10000,
          transition: isWalking ? 'none' : 'all 0.3s ease',
          transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
          pointerEvents: 'none'
        }}
      >
        {/* Simple 2D Avatar - Will be replaced with Mixamo sprite */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: isWalking ? 'walk 0.6s steps(2) infinite' : isTalking ? 'talk 0.5s ease-in-out infinite' : 'idle 2s ease-in-out infinite'
          }}
        >
          {/* Head */}
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#f5d5b8',
              border: '3px solid #333',
              marginBottom: '5px',
              position: 'relative'
            }}
          >
            {/* Eyes */}
            <div style={{ position: 'absolute', top: '15px', left: '12px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#333' }} />
            <div style={{ position: 'absolute', top: '15px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#333' }} />
            {/* Mouth */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '20px',
              height: '10px',
              borderRadius: '0 0 20px 20px',
              border: '2px solid #333',
              borderTop: 'none'
            }} />
          </div>

          {/* Body */}
          <div
            style={{
              width: '45px',
              height: '60px',
              backgroundColor: '#4a90e2',
              borderRadius: '8px',
              border: '3px solid #333',
              marginBottom: '5px'
            }}
          />

          {/* Legs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '15px', height: '40px', backgroundColor: '#2c3e50', borderRadius: '4px', border: '2px solid #333' }} />
            <div style={{ width: '15px', height: '40px', backgroundColor: '#2c3e50', borderRadius: '4px', border: '2px solid #333' }} />
          </div>
        </div>
      </div>

      {/* Speech Bubble */}
      {(currentMessage || isTyping) && (
        <div
          style={{
            position: 'fixed',
            left: `${avatarPosition.x + 140}px`,
            top: `${avatarPosition.y - 20}px`,
            maxWidth: '300px',
            backgroundColor: 'white',
            padding: '12px 16px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            color: '#333',
            zIndex: 10001,
            border: '2px solid #667eea',
            pointerEvents: 'none'
          }}
        >
          {isTyping ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#667eea', animation: 'bounce 1s infinite' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#667eea', animation: 'bounce 1s infinite 0.2s' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#667eea', animation: 'bounce 1s infinite 0.4s' }} />
            </div>
          ) : (
            currentMessage
          )}
          {/* Bubble tail */}
          <div
            style={{
              position: 'absolute',
              left: '-10px',
              top: '20px',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderRight: '10px solid white'
            }}
          />
        </div>
      )}

      {/* Chat Input */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          maxWidth: '500px',
          zIndex: 10001
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '2px solid #667eea'
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '10px 18px',
              borderRadius: '30px',
              border: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f5f5f5'
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            style={{
              padding: '10px 24px',
              backgroundColor: inputValue.trim() ? '#667eea' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Send
          </button>
        </form>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes walk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes talk {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </>
  )
}
