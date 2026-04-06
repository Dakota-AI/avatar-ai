import { createRoot } from 'react-dom/client'
import { AvatarWidget } from './components/AvatarWidget'

export { AvatarWidget }

// Auto-initialization for script tag usage
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.AvatarWidget = {
    init: (config?: { apiEndpoint?: string; initialMessage?: string }) => {
      const container = document.createElement('div')
      container.id = 'avatar-widget-root'
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(<AvatarWidget {...config} />)
    }
  }
}
