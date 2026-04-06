import { useState } from 'react'

export function SimpleWidget() {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      {!visible ? (
        <button
          onClick={() => setVisible(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '80px',
            height: '80px',
            fontSize: '40px',
            backgroundColor: '#667eea',
            color: 'white',
            border: '3px solid white',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2147483647
          }}
        >
          👋
        </button>
      ) : (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            padding: '20px',
            backgroundColor: 'white',
            border: '3px solid #667eea',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2147483647
          }}
        >
          <button
            onClick={() => setVisible(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '30px',
              height: '30px',
              border: 'none',
              background: '#ff4444',
              color: 'white',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
          <h3 style={{ marginTop: 0 }}>Avatar Widget</h3>
          <p>Hello! I'm working. Click X to close.</p>
          <input
            type="text"
            placeholder="Type here..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              marginTop: '10px'
            }}
          />
        </div>
      )}
    </div>
  )
}
