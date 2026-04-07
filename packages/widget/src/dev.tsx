import { createRoot } from 'react-dom/client'
import { AvatarController } from './components/AvatarController'

const container = document.getElementById('avatar-widget-root')!
createRoot(container).render(
  <AvatarController
    apiEndpoint="http://localhost:3001/chat"
    initialMessage="Hi! I'm your AI shopping assistant. Ask me about any product!"
  />
)
