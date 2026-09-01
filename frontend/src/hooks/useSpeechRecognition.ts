import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void
  onError?: (message: string) => void
}

interface UseSpeechRecognitionResult {
  isSupported: boolean
  isListening: boolean
  start: () => void
  stop: () => void
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

export function useSpeechRecognition({
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isSupported = Boolean(getSpeechRecognitionCtor())

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onError?.('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError?.('Microphone access was denied. Allow microphone access and try again.')
      } else if (event.error === 'no-speech') {
        onError?.("Didn't catch that — no speech detected. Try again.")
      } else {
        onError?.(`Voice input error: ${event.error}`)
      }
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onResult, onError])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  return { isSupported, isListening, start, stop }
}
