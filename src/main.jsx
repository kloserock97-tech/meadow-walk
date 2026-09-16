import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { createPanel } from './panel.js'
import { timeline } from './config.js'
import './styles.css'

// без WebGL2 сцена не поднимется — честная заглушка вместо чёрного экрана
const probe = document.createElement('canvas').getContext('webgl2')
if (!probe) {
  document.getElementById('fallback').hidden = false
} else {
  createRoot(document.getElementById('root')).render(<App />)
  const gui = createPanel()
  if (!timeline.showUI) {
    gui.hide()
    document.body.classList.add('clean')
  }
}
