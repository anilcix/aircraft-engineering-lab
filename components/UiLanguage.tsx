'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type UiLanguage = 'tr' | 'en'

type LanguageContextValue = {
  language: UiLanguage
  setLanguage: (value: UiLanguage) => void
  tr: boolean
}

const LanguageContext = createContext<LanguageContextValue>({ language: 'tr', setLanguage: () => undefined, tr: true })

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>('tr')

  useEffect(() => {
    const saved = window.localStorage.getItem('ael-ui-language')
    if (saved === 'tr' || saved === 'en') setLanguageState(saved)
  }, [])

  const setLanguage = (value: UiLanguage) => {
    setLanguageState(value)
    window.localStorage.setItem('ael-ui-language', value)
    document.documentElement.lang = value
  }

  const value = useMemo(() => ({ language, setLanguage, tr: language === 'tr' }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useUiLanguage() {
  return useContext(LanguageContext)
}
