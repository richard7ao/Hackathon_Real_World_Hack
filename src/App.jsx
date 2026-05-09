import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './AnalysisContext'
import Landing from './pages/Landing'
import TheLine from './pages/TheLine'
import TheFix from './pages/TheFix'
import TheDefect from './pages/TheDefect'

export default function App() {
  return (
    <BrowserRouter>
      <AnalysisProvider>
        <Routes>
          <Route path="/"       element={<Landing />} />
          <Route path="/demo"   element={<TheLine />} />
          <Route path="/defect" element={<TheDefect />} />
          <Route path="/fix"    element={<TheFix />} />
        </Routes>
      </AnalysisProvider>
    </BrowserRouter>
  )
}
