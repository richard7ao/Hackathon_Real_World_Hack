import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const NarratorCtx = createContext(null)

const DEFAULT_VOICE = 'pNInz6obpgDQGcFmaJgB' // Adam — calm, authoritative

export function NarratorProvider({ children }) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef      = useRef(null)
  const abortRef      = useRef(null)
  const pendingRef    = useRef(null)  // last text attempted — replayed on button click
  const speakRef      = useRef(null)  // forward ref so listeners can call speak without deps

  function stopAudio() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
    setSpeaking(false)
  }

  const speak = useCallback(async (text) => {
    if (!text) return
    stopAudio()
    pendingRef.current = text

    const apiKey  = import.meta.env.VITE_ELEVENLABS_API_KEY
    const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || DEFAULT_VOICE

    if (!apiKey) {
      console.warn('[Narrator] Set VITE_ELEVENLABS_API_KEY in .env.local to enable voice.')
      return
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSpeaking(true)

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_flash_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15 },
          }),
          signal: ctrl.signal,
        }
      )

      if (!res.ok) {
        const msg = await res.text().catch(() => res.status)
        throw new Error(`ElevenLabs ${res.status}: ${msg}`)
      }

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        URL.revokeObjectURL(url)
        setSpeaking(false)
        audioRef.current = null
      }

      await audio.play()
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('[Narrator]', err.message)
      setSpeaking(false)
      // pendingRef is kept so the button can retry
    }
  }, [])

  speakRef.current = speak

  // Replay pending narration on the very first user interaction anywhere on the page.
  // Browsers block audio.play() until a gesture has occurred — this catches that case.
  useEffect(() => {
    function onFirstInteraction() {
      if (pendingRef.current) speakRef.current(pendingRef.current)
      document.removeEventListener('click',   onFirstInteraction)
      document.removeEventListener('keydown', onFirstInteraction)
    }
    document.addEventListener('click',   onFirstInteraction)
    document.addEventListener('keydown', onFirstInteraction)
    return () => {
      document.removeEventListener('click',   onFirstInteraction)
      document.removeEventListener('keydown', onFirstInteraction)
    }
  }, [])

  // Button handler: speaking → stop; idle → replay last narration
  const toggle = useCallback(() => {
    if (speaking) {
      stopAudio()
    } else if (pendingRef.current) {
      speak(pendingRef.current)
    }
  }, [speaking, speak])

  return (
    <NarratorCtx.Provider value={{ speak, stop: stopAudio, toggle, speaking }}>
      {children}
    </NarratorCtx.Provider>
  )
}

export const useNarrator = () => useContext(NarratorCtx)
