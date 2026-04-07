interface SpeechBubbleProps {
  message: string
  isTyping: boolean
  side?: 'left' | 'right'
}

export function SpeechBubble({ message, isTyping, side = 'right' }: SpeechBubbleProps) {
  const bubbleSide = side === 'right' ? 'right' : 'left'
  const tailSide = side === 'right' ? 'right' : 'left'

  return (
    <>
      <style>{`
        @keyframes avatar-pop-in {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes avatar-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-8px); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          [bubbleSide]: '410px',
          bottom: '260px',
          maxWidth: '320px',
          minWidth: '160px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '20px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
          fontSize: '15px',
          color: '#2c3e50',
          lineHeight: '1.55',
          zIndex: 10001,
          animation: 'avatar-pop-in 0.35s ease',
          border: '1.5px solid #f0f0f0',
          pointerEvents: 'none',
        }}
      >
        {isTyping ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#667eea', fontStyle: 'italic', fontSize: '13px' }}>Thinking</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#667eea',
                    animation: `avatar-bounce 1.4s infinite ease-in-out both`,
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          message
        )}

        {/* Tail pointing toward the avatar */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            [tailSide]: '-11px',
            width: 0,
            height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            [tailSide === 'right' ? 'borderLeft' : 'borderRight']: '11px solid #ffffff',
          }}
        />
        {/* Tail border */}
        <div
          style={{
            position: 'absolute',
            bottom: '27px',
            [tailSide]: '-13px',
            width: 0,
            height: 0,
            borderTop: '11px solid transparent',
            borderBottom: '11px solid transparent',
            [tailSide === 'right' ? 'borderLeft' : 'borderRight']: '13px solid #f0f0f0',
            zIndex: -1,
          }}
        />
      </div>
    </>
  )
}
