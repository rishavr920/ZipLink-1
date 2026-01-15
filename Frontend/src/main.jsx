import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import RedirectHandler from './components/RedirectHandler.jsx'

const RedirectRoute = () => {
  const { code } = useParams();
  return <RedirectHandler code={code} />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:code" element={<RedirectRoute />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
