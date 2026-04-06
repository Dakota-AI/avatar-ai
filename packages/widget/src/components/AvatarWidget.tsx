import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Avatar3D } from './Avatar3D'
import { Avatar3DModel } from './Avatar3DModel'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AvatarWidgetProps {
  apiEndpoint?: string
  initialMessage?: string
  position?: 'left' | 'right'
  useCustomModel?: boolean
  modelPath?: string
}

export function AvatarWidget({
  apiEndpoint = 'http://localhost:3001/chat',
  initialMessage = "Hi! I'm here to help. How can I assist you today?",
  position = 'right',
  useCustomModel = true,
  modelPath = '/models/avatar.glb'
}: AvatarWidgetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState(initialMessage)
  const [isTalking, setIsTalking] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (isVisible && !isAnimatingIn) {
      setIsAnimatingIn(true)
      // Show initial message after avatar walks in
      setTimeout(() => {
        setCurrentMessage(initialMessage)
        setIsTalking(true)
        setTimeout(() => setIsTalking(false), 2000)
      }, 1000)
    }
  }, [isVisible, isAnimatingIn, initialMessage])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Add user message
    const userMessage: Message = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])
    setCurrentMessage(`You: ${content}`)
    setInputValue('')

    // Show typing indicator
    setIsTyping(true)
    setIsTalking(false)

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      })

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "I'm here to help! (Backend not connected yet - this is a demo response)"
      }

      setMessages(prev => [...prev, assistantMessage])

      // Simulate "thinking" delay for more human feel
      setTimeout(() => {
        setIsTyping(false)
        setCurrentMessage(assistantMessage.content)
        setIsTalking(true)

        // Calculate talking duration based on response length
        const talkingDuration = Math.min(assistantMessage.content.length * 30, 4000)
        setTimeout(() => setIsTalking(false), talkingDuration)
      }, 800)

    } catch (error) {
      // Fallback response for now
      const assistantMessage: Message = {
        role: 'assistant',
        content: "I'm here to help! How can I assist you today?"
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
      setCurrentMessage(assistantMessage.content)
      setIsTalking(true)
      setTimeout(() => setIsTalking(false), 2000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  // Trigger button - small and subtle
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          [position]: '30px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#667eea',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
          fontSize: '28px',
          color: 'white',
          zIndex: 9998,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)'
        }}
      >
        👋
      </button>
    )
  }

  // Avatar stands independently on the page - no container!
  return (
    <>
      {/* Close button - floating near avatar */}
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: 'fixed',
          [position]: '20px',
          top: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #667eea',
          cursor: 'pointer',
          fontSize: '22px',
          color: '#667eea',
          zIndex: 10002,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          animation: 'fadeIn 0.5s ease 0.8s both',
        }}
        title="Dismiss assistant"
      >
        ×
      </button>

      {/* 3D Avatar - Standalone on the page! */}
      <div style={{
        position: 'fixed',
        [position]: '40px',
        bottom: 0,
        width: '350px',
        height: '55vh',
        minHeight: '450px',
        maxHeight: '600px',
        zIndex: 10000,
        pointerEvents: 'none',
        animation: `slideIn${position === 'right' ? 'Right' : 'Left'} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)`,
      }}>
        <Canvas style={{ pointerEvents: 'auto' }} shadows>
          <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={45} />
          {/* Ambient base lighting */}
          <ambientLight intensity={0.4} />
          {/* Key light - main light source */}
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          {/* Fill light - softer from the side */}
          <directionalLight position={[-3, 5, -2]} intensity={0.6} color="#b3d9ff" />
          {/* Rim light - highlights edges */}
          <directionalLight position={[0, 3, -5]} intensity={0.8} color="#ffd4a3" />
          {/* Top light for depth */}
          <spotLight
            position={[0, 10, 0]}
            intensity={0.5}
            angle={0.6}
            penumbra={1}
            color="#ffffff"
          />
          {/* Floor light for professional look */}
          <pointLight position={[0, 0, 3]} intensity={0.3} color="#667eea" />
          {useCustomModel ? (
            <Avatar3DModel
              modelPath={modelPath}
              isTalking={isTalking}
              isWalkingIn={isAnimatingIn}
            />
          ) : (
            <Avatar3D isTalking={isTalking} isWalkingIn={isAnimatingIn} />
          )}
        </Canvas>
      </div>

      {/* Speech bubble - floating next to avatar */}
      {(currentMessage || isTyping) && (
        <div style={{
          position: 'fixed',
          [position === 'right' ? 'right' : 'left']: '380px',
          bottom: '250px',
          maxWidth: '350px',
          backgroundColor: 'white',
          padding: '1.25rem 1.5rem',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          fontSize: '16px',
          color: '#2c3e50',
          lineHeight: '1.6',
          zIndex: 10001,
          animation: 'popIn 0.4s ease',
          border: '2px solid #f0f0f0',
        }}>
          {isTyping ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#667eea', fontStyle: 'italic' }}>Thinking</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0s'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.2s'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.4s'
                }} />
              </div>
            </div>
          ) : (
            currentMessage
          )}
          {/* Speech bubble tail pointing to avatar */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            [position === 'right' ? 'right' : 'left']: '-12px',
            width: 0,
            height: 0,
            borderTop: '12px solid transparent',
            borderBottom: '12px solid transparent',
            [position === 'right' ? 'borderLeft' : 'borderRight']: '12px solid white',
          }} />
        </div>
      )}

      {/* Minimal input bar - bottom of screen, compact and subtle */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'auto',
        maxWidth: '450px',
        zIndex: 10001,
        animation: 'slideUp 0.5s ease 0.5s both',
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '6px',
          borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            autoFocus
            style={{
              width: '280px',
              padding: '10px 18px',
              borderRadius: '30px',
              border: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f5f5f5',
              color: '#2c3e50',
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            style={{
              padding: '10px 22px',
              backgroundColor: inputValue.trim() ? '#667eea' : '#d0d0d0',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim()) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (inputValue.trim()) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            Send
          </button>
        </form>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        @keyframes popIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </>
  )
}
