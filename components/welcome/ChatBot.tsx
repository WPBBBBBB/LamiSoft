"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Trash2, Menu, Plus } from "lucide-react"
import { t } from "@/lib/translations"
import { useSettings } from "@/components/providers/settings-provider"
import Image from "next/image"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const MAX_MESSAGES = 80

export default function ChatBot() {
  const { currentLanguage } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get current conversation messages
  const messages = useMemo(() => {
    const conv = conversations.find(c => c.id === currentConversationId)
    return conv?.messages || []
  }, [conversations, currentConversationId])

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatbot_conversations")
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[]
        setConversations(parsed)
        // Set the most recent conversation as current
        if (parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt)
          setCurrentConversationId(sorted[0].id)
        }
      }
    } catch {}
  }, [])

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        localStorage.setItem("chatbot_conversations", JSON.stringify(conversations))
      } catch {}
    }
  }, [conversations])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Create a new conversation
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: t("chatbotNewConversation", currentLanguage.code),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConv, ...prev])
    setCurrentConversationId(newConv.id)
  }

  // Delete a conversation
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const filtered = conversations.filter(c => c.id !== id)
    setConversations(filtered)
    
    // If deleted current conversation, switch to another or create new
    if (id === currentConversationId) {
      if (filtered.length > 0) {
        setCurrentConversationId(filtered[0].id)
      } else {
        setCurrentConversationId(null)
      }
    }
    
    // Clear localStorage if no conversations left
    if (filtered.length === 0) {
      localStorage.removeItem("chatbot_conversations")
    }
  }

  // Switch to a conversation
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id)
  }

  // Generate title from first user message
  const generateTitle = (messages: Message[]): string => {
    const firstUserMsg = messages.find(m => m.role === "user")
    if (firstUserMsg) {
      const content = firstUserMsg.content
      return content.length > 30 ? content.slice(0, 30) + "..." : content
    }
    return t("chatbotNewConversation", currentLanguage.code)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Create new conversation if none exists
    if (!currentConversationId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: t("chatbotNewConversation", currentLanguage.code),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations(prev => [newConv, ...prev])
      setCurrentConversationId(newConv.id)
      return
    }

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    }

    // Update current conversation with new message
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        const newMessages = [...conv.messages, userMessage].slice(-MAX_MESSAGES)
        return {
          ...conv,
          messages: newMessages,
          updatedAt: Date.now(),
          // Update title if this is the first message
          title: conv.messages.length === 0 ? generateTitle([userMessage]) : conv.title,
        }
      }
      return conv
    }))

    setInput("")
    setIsLoading(true)

    try {
      const currentConv = conversations.find(c => c.id === currentConversationId)
      const context = [...(currentConv?.messages || []), userMessage].slice(-MAX_MESSAGES)

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: context,
          language: currentLanguage.code,
        }),
      })

      if (!response.ok) {
        throw new Error(t("chatbotErrorResponse", currentLanguage.code))
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || t("chatbotNoResponse", currentLanguage.code),
        timestamp: Date.now(),
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage].slice(-MAX_MESSAGES),
            updatedAt: Date.now(),
          }
        }
        return conv
      }))
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: t("chatbotError", currentLanguage.code),
        timestamp: Date.now(),
      }
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, errorMessage].slice(-MAX_MESSAGES),
            updatedAt: Date.now(),
          }
        }
        return conv
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showLogo = messages.length === 0

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-2xl"
              onClick={() => setIsOpen(true)}
              title={t("chatbotOpen", currentLanguage.code)}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog with Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-4xl"
          >
            <div className="flex h-[600px] shadow-2xl rounded-lg overflow-hidden border-2">
              {/* Sidebar */}
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "280px", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-r bg-muted/30 flex flex-col overflow-hidden"
                  >
                    {/* Sidebar Header */}
                    <div className="p-3 border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{t("chatbotConversations", currentLanguage.code)}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleNewChat}
                        title={t("chatbotNewChat", currentLanguage.code)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {conversations.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-8">
                          {t("chatbotNoConversations", currentLanguage.code)}
                        </div>
                      ) : (
                        conversations
                          .sort((a, b) => b.updatedAt - a.updatedAt)
                          .map((conv) => (
                            <div
                              key={conv.id}
                              className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                                conv.id === currentConversationId ? "bg-muted" : ""
                              }`}
                              onClick={() => handleSelectConversation(conv.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{conv.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {conv.messages.length} {t("chatbotMessages", currentLanguage.code)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                title={t("delete", currentLanguage.code)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Chat Area */}
              <Card className="flex flex-col flex-1 border-0 rounded-none">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      <Image
                        src="/aave.svg"
                        alt="AL-LamiSoft"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{t("chatbotTitle", currentLanguage.code)}</h3>
                      <p className="text-xs text-muted-foreground">{t("chatbotSubtitle", currentLanguage.code)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={handleNewChat}
                    >
                      {t("chatbotNewChat", currentLanguage.code)}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                  {/* Background Logo (only when no messages) */}
                  {showLogo && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="relative w-32 h-32 opacity-10">
                        <Image
                          src="/aave.svg"
                          alt="AL-LamiSoft Logo"
                          width={128}
                          height={128}
                          className="object-contain"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Welcome Message */}
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%] bg-primary/10 rounded-2xl rounded-tl-sm p-3 text-sm">
                        {t("chatbotWelcome", currentLanguage.code)}
                      </div>
                    </motion.div>
                  )}

                  {/* Messages */}
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={`${msg.timestamp}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%] bg-muted rounded-2xl rounded-tl-sm p-3 text-sm flex gap-1">
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        >
                          •
                        </motion.span>
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        >
                          •
                        </motion.span>
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        >
                          •
                        </motion.span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder={t("chatbotPlaceholder", currentLanguage.code)}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t("chatbotDisclaimer", currentLanguage.code)}
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
