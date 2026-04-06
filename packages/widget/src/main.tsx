import { createRoot } from 'react-dom/client'
import { AvatarWidget } from './components/AvatarWidget'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<AvatarWidget />)
}
