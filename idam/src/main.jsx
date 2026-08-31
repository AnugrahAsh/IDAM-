import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { AppProvider } from './store/AppContext'
import TooltipProvider from './components/viz/TooltipProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </AppProvider>
  </StrictMode>,
)
