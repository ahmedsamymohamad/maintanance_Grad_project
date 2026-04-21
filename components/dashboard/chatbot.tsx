'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, X, Maximize2, Minimize2, Wrench, Moon, Sun } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ThemeType = 'dark' | 'light'

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello 👋 Welcome to Maintenance EIS System!\n\nI\'m here to help you with:\n• Maintenance requests\n• System troubleshooting\n\nWhat can I assist you with today?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [theme, setTheme] = useState<ThemeType>('dark')
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Chat API error:', response.status, errorData)
        throw new Error(errorData?.error || `Failed to get response (${response.status})`)
      }

      const data = await response.json()
      
      if (!data.content) {
        console.error('Invalid response format:', data)
        throw new Error('Invalid response format from server')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div
          ref={containerRef}
          className={`flex flex-col rounded-2xl transition-all duration-300 ${
            isExpanded ? 'w-[90vw] h-[90vh] max-w-5xl' : 'w-96 h-[32rem]'
          } ${
            isDark
              ? 'bg-slate-900 border border-slate-700/50 shadow-2xl shadow-black/30'
              : 'bg-white border border-slate-200 shadow-2xl shadow-slate-900/10'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
              isDark
                ? 'border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-800/50'
                : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`p-2 rounded-lg ${
                  isDark
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h2
                  className={`text-lg font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Maintenance EIS System
                </h2>
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  AI-Powered Hardware Support
                </p>
              </div>
            </div>

            {/* Header Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDark
                    ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'
                    : 'hover:bg-red-50 text-slate-600 hover:text-red-600'
                }`}
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            className={`flex-1 overflow-y-auto p-5 space-y-4 ${
              isDark
                ? 'bg-slate-900/50'
                : 'bg-gradient-to-b from-slate-50 to-white'
            }`}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDark
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-blue-100 text-blue-600 border border-blue-200'
                    }`}
                  >
                    🤖
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[70%] text-sm leading-relaxed whitespace-pre-wrap break-words transition-all duration-200 ${
                    msg.role === 'user'
                      ? isDark
                        ? 'bg-gradient-to-br from-cyan-600 to-cyan-500 text-white rounded-br-none shadow-lg'
                        : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-none shadow-md'
                      : isDark
                      ? 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/50 shadow-lg'
                      : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDark
                        ? 'bg-slate-700 text-slate-300 border border-slate-600'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    👤
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start animate-in fade-in">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDark
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-blue-100 text-blue-600 border border-blue-200'
                  }`}
                >
                  🤖
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 flex items-center gap-2 rounded-bl-none ${
                    isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/50'
                      : 'bg-slate-100 text-slate-900 border border-slate-200'
                  }`}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div
            className={`border-t flex-shrink-0 p-4 ${
              isDark
                ? 'border-slate-700/50 bg-slate-800'
                : 'border-slate-100 bg-slate-50'
            }`}
          >
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                placeholder="Describe your issue..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                autoFocus
                className={`flex-1 px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500'
                    : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  isDark
                    ? isLoading || !input.trim()
                      ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-br from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg hover:shadow-cyan-500/20'
                    : isLoading || !input.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-md hover:shadow-blue-500/20'
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`rounded-full h-16 w-16 shadow-2xl transition-all duration-300 flex items-center justify-center font-bold text-2xl ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-500/50 hover:scale-110'
              : 'bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-500/50 hover:scale-110'
          }`}
          title="Open Maintenance EIS System"
        >
          🔧
        </button>
      )}
    </div>
  )
}
