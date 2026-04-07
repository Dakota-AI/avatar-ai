import { useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useAvatarState } from '../hooks/useAvatarState'
import { usePageContext } from '../hooks/usePageContext'
import { postChat, generateSessionId, ChatResponse } from '../lib/api'
import { AvatarCharacter, AvatarAnimation } from './AvatarCharacter'
import { SpeechBubble } from './SpeechBubble'
import { ChatBar } from './ChatBar'
import { PeekTab } from './PeekTab'
import { PageScanner } from './PageScanner'

interface AvatarControllerProps {
  apiEndpoint?: string
  initialMessage?: string
  modelPath?: string
}

export function AvatarController({
  apiEndpoint = 'http://localhost:3001/chat',
  initialMessage = "Hi! I'm here to help. Ask me anything about the products on this page!",
  modelPath = '/models/avatar.glb',
}: AvatarControllerProps) {
  const { state, interact, dismiss, peek, summon, resetInactivityTimer } = useAvatarState()
  const { products, pageContext, handleProductsDetected, handleProductClicked, lastClickedProduct } =
    usePageContext()

  const [sessionId] = useState(() => generateSessionId())
  const [speechText, setSpeechText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState<AvatarAnimation>('idle')
  const [isWalkingIn, setIsWalkingIn] = useState(false)
  const [isWalkingOff, setIsWalkingOff] = useState(false)

  useEffect(() => {
    if (state === 'greeting') {
      setIsWalkingIn(true)
      setIsWalkingOff(false)
      setCurrentAnimation('walk')
      setSpeechText('')
    }
    if (state === 'walking-off') {
      setIsWalkingOff(true)
      setIsWalkingIn(false)
      setCurrentAnimation('walk')
      setSpeechText('')
    }
    if (state === 'hidden' || state === 'peeking') {
      setIsWalkingIn(false)
      setIsWalkingOff(false)
    }
  }, [state])

  const handleWalkInComplete = useCallback(() => {
    setCurrentAnimation('wave')
    setSpeechText(initialMessage)
    setTimeout(() => setCurrentAnimation('idle'), 2500)
  }, [initialMessage])

  const handleWalkOffComplete = useCallback(() => {
    peek()
    setIsWalkingOff(false)
    setCurrentAnimation('idle')
  }, [peek])

  useEffect(() => {
    if (!lastClickedProduct) return
    interact()
    setCurrentAnimation('talk')
    setSpeechText(`Let me tell you about ${lastClickedProduct.name}!`)
    resetInactivityTimer()
    setTimeout(() => setCurrentAnimation('idle'), 2500)
  }, [lastClickedProduct])

  const handleSend = useCallback(async (message: string) => {
    interact()
    resetInactivityTimer()
    setSpeechText('')
    setIsTyping(true)
    setCurrentAnimation('idle')

    try {
      const data: ChatResponse = await postChat(apiEndpoint, {
        message,
        sessionId,
        pageContext,
      })

      setIsTyping(false)
      setSpeechText(data.response)
      setCurrentAnimation('talk')

      if (data.targetProduct) {
        const target = products.find((p) => p.id === data.targetProduct)
        if (target) {
          // Brief slide toward product — future enhancement
        }
      }

      const talkMs = Math.min(data.response.length * 35, 4500)
      setTimeout(() => setCurrentAnimation('idle'), talkMs)
    } catch {
      setIsTyping(false)
      setSpeechText("Sorry, I had trouble connecting. Please try again!")
      setCurrentAnimation('talk')
      setTimeout(() => setCurrentAnimation('idle'), 2000)
    }
  }, [apiEndpoint, sessionId, pageContext, products, interact, resetInactivityTimer])

  const showCanvas = state === 'greeting' || state === 'visible' || state === 'walking-off'
  const showChatUI = state === 'visible' || state === 'greeting'
  const showSpeech = showChatUI && (speechText.length > 0 || isTyping)

  return (
    <>
      <PageScanner
        enabled={state !== 'hidden'}
        onProductsDetected={handleProductsDetected}
        onProductClicked={handleProductClicked}
      />

      {showCanvas && (
        <div
          style={{
            position: 'fixed',
            right: '40px',
            bottom: 0,
            width: '320px',
            height: '520px',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          <Canvas style={{ pointerEvents: 'auto' }} shadows>
            <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={45} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-3, 5, -2]} intensity={0.6} color="#b3d9ff" />
            <directionalLight position={[0, 3, -5]} intensity={0.8} color="#ffd4a3" />
            <pointLight position={[0, 0, 3]} intensity={0.3} color="#667eea" />
            <AvatarCharacter
              modelPath={modelPath}
              currentAnimation={currentAnimation}
              isWalkingIn={isWalkingIn}
              isWalkingOff={isWalkingOff}
              onWalkInComplete={handleWalkInComplete}
              onWalkOffComplete={handleWalkOffComplete}
            />
          </Canvas>
        </div>
      )}

      {showSpeech && (
        <SpeechBubble message={speechText} isTyping={isTyping} side="right" />
      )}

      {showChatUI && (
        <button
          onClick={dismiss}
          title="Dismiss assistant"
          style={{
            position: 'fixed',
            right: '24px',
            top: '24px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1.5px solid #667eea',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#667eea',
            zIndex: 10002,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          ×
        </button>
      )}

      {showChatUI && (
        <ChatBar onSend={handleSend} disabled={isTyping} />
      )}

      {state === 'peeking' && (
        <PeekTab onClick={summon} />
      )}
    </>
  )
}
