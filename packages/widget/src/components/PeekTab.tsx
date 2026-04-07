interface PeekTabProps {
  onClick: () => void
  label?: string
}

export function PeekTab({ onClick, label = 'Need help?' }: PeekTabProps) {
  return (
    <>
      <style>{`
        @keyframes avatar-peek-slide-in {
          from { transform: translateX(100%) translateY(-50%); }
          to   { transform: translateX(0)     translateY(-50%); }
        }
        .avatar-peek-tab:hover {
          transform: translateX(-4px) translateY(-50%) !important;
          box-shadow: -4px 4px 20px rgba(102, 126, 234, 0.45) !important;
        }
      `}</style>
      <button
        className="avatar-peek-tab"
        onClick={onClick}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateX(0) translateY(-50%)',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '10px 0 0 10px',
          padding: '14px 10px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          letterSpacing: '0.04em',
          zIndex: 9999,
          boxShadow: '-2px 2px 12px rgba(102, 126, 234, 0.35)',
          animation: 'avatar-peek-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {label}
      </button>
    </>
  )
}
