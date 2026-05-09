import { createContext, useContext, useEffect, useRef, useState } from 'react'

const Ctx = createContext(null)

export function AnalysisProvider({ children }) {
  const [state, setState] = useState({
    defectPattern: 'edge-ring',
    imageId: null,
    confidence: null,
    enrichment: null,
    correlation: null,
    fixResult: null,
    imagePreviewUrl: null,
  })

  // Track previous object URL so we can revoke it when a new image is uploaded
  // (or when the provider unmounts) to avoid leaking blob memory.
  const prevUrlRef = useRef(null)

  function update(patch) {
    setState(prev => {
      if ('imagePreviewUrl' in patch && prev.imagePreviewUrl && prev.imagePreviewUrl !== patch.imagePreviewUrl) {
        URL.revokeObjectURL(prev.imagePreviewUrl)
      }
      const next = { ...prev, ...patch }
      prevUrlRef.current = next.imagePreviewUrl
      return next
    })
  }

  useEffect(() => () => {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
  }, [])

  return <Ctx.Provider value={{ ...state, update }}>{children}</Ctx.Provider>
}

export function useAnalysis() {
  return useContext(Ctx)
}
