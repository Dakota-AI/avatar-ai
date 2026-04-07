import { createRoot } from 'react-dom/client'
import { AvatarController } from './components/AvatarController'

export { AvatarController }

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.AvatarWidget = {
    init: (config?: {
      apiEndpoint?: string
      initialMessage?: string
      modelPath?: string
    }) => {
      const existing = document.getElementById('avatar-widget-root')
      if (existing) return

      const container = document.createElement('div')
      container.id = 'avatar-widget-root'
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(<AvatarController {...config} />)
    },
  }
}
