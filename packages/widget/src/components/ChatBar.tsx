import React, { useState } from 'react'

interface ChatBarProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatBar({ onSend, disabled = false, placeholder = 'Ask me anything...' }: ChatBarProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <>
      <style>{`
        @keyframes avatar-slide-up {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          animation: 'avatar-slide-up 0.4s ease',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            padding: '6px 6px 6px 6px',
            borderRadius: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.11)',
            backdropFilter: 'blur(10px)',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
            style={{
              width: '280px',
              padding: '10px 18px',
              borderRadius: '30px',
              border: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f4f4f5',
              color: '#2c3e50',
              opacity: disabled ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              padding: '10px 22px',
              backgroundColor: canSend ? '#667eea' : '#d0d0d0',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (canSend) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (canSend) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  )
}
