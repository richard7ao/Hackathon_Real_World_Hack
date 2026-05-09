import { createContext, useContext, useState } from 'react'

const Ctx = createContext(null)

export function AnalysisProvider({ children }) {
  const [state, setState] = useState({
    defectPattern: 'edge-ring',
    imageId: null,
    confidence: null,
    enrichment: null,
    correlation: null,
    fixResult: null,
  })

  function update(patch) {
    setState(prev => ({ ...prev, ...patch }))
  }

  return <Ctx.Provider value={{ ...state, update }}>{children}</Ctx.Provider>
}

export function useAnalysis() {
  return useContext(Ctx)
}
