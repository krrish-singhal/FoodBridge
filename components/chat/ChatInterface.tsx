'use client'

import { useEffect, useState, useRef } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fetchConversations, fetchMessages, sendMessage as sendChatMessage } from '@/app/actions/chat'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  match_id: string
  created_at: string
  other_org: {
    id: string
    name: string
    type: string
  }
  food_name: string
}

interface Message {
  id: string
  content: string
  created_at: string
  sender_org_id: string
}

  export function ChatInterface({ organizationId, userId }: { organizationId: string, userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    let channel: any

    if (activeConvId) {
      loadMessages(activeConvId)

      // Supabase Realtime live sync
      try {
        const supabase = createClient()
        channel = supabase
          .channel(`conversation:${activeConvId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${activeConvId}`,
            },
            (payload: any) => {
              const newMsg = payload.new as Message
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev
                return [...prev, newMsg]
              })
            }
          )
          .subscribe()
      } catch (err) {
        console.warn('Realtime channel subscription error:', err)
      }

      // Resilient interval polling fallback
      interval = setInterval(() => {
        loadMessages(activeConvId)
      }, 4000)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (channel) {
        try {
          const supabase = createClient()
          supabase.removeChannel(channel)
        } catch {}
      }
    }
  }, [activeConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    setLoading(true)
    const formatted = await fetchConversations(organizationId)
    setConversations(formatted)
    if (formatted.length > 0) setActiveConvId(formatted[0].id)
    setLoading(false)
  }

  async function loadMessages(convId: string) {
    const data = await fetchMessages(convId)
    setMessages(data)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!msgInput.trim() || !activeConvId) return

    setSending(true)
    try {
      await sendChatMessage(activeConvId, organizationId, userId, msgInput.trim())
      setMsgInput('')
      await loadMessages(activeConvId)
    } catch (error) {
      console.error(error)
    }
    setSending(false)
  }

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex h-[600px] overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No active conversations.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {conversations.map(c => (
                <li 
                  key={c.id} 
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors ${activeConvId === c.id ? 'bg-gray-200/60' : ''}`}
                >
                  <p className="font-medium text-sm text-gray-900">{c.other_org?.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.food_name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p>Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900">
                {conversations.find(c => c.id === activeConvId)?.other_org?.name}
              </h3>
              <p className="text-xs text-gray-500">
                Regarding: {conversations.find(c => c.id === activeConvId)?.food_name}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map(m => {
                const isMine = m.sender_org_id === organizationId
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-2 ${isMine ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                      <p className="text-sm">{m.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-green-200' : 'text-gray-400'}`}>
                        {format(new Date(m.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={!msgInput.trim() || sending}
                  className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
