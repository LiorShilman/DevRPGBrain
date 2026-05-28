import { createContext, useContext, useState, ReactNode } from 'react'
import { ChatMessage } from '../services/api'

interface GlobalBrainContextValue {
  history: ChatMessage[]
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

const GlobalBrainContext = createContext<GlobalBrainContextValue | null>(null)

export function GlobalBrainProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  return (
    <GlobalBrainContext.Provider value={{ history, setHistory }}>
      {children}
    </GlobalBrainContext.Provider>
  )
}

export function useGlobalBrain() {
  const ctx = useContext(GlobalBrainContext)
  if (!ctx) throw new Error('useGlobalBrain must be used inside GlobalBrainProvider')
  return ctx
}
