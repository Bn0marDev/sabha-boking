"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Search,
  Phone,
  MapPin,
  Facebook,
  Copy,
  RefreshCw,
  Moon,
  Sun,
  Building2,
  Clock,
  Filter,
  MessageCircle,
  Send,
  Bot,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"

interface RestArea {
  الاسم: string
  "رقم الهاتف": string
  العنوان: string
  "رابط الفيسبوك": string
  "ملاحظات إضافية": string
  row_number: number
}

interface ChatMessage {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
}

const WEBHOOK_URL = "https://n8n.m0usa.ly/webhook/webhook/excel-sync"
const CHATBOT_WEBHOOK_URL = "https://n8n.m0usa.ly/webhook/e808fb64-846f-409a-a8d3-727d65634651"
const REFRESH_INTERVAL = 30000

export default function RestAreasManager() {
  const [data, setData] = useState<RestArea[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("الاسم")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [stats, setStats] = useState({ total: 0, loadTime: 0 })

  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "bot",
      content:
        "مرحباً! يمكنني مساعدتك في البحث عن الاستراحات والاستعلام عنها. اسأل عن أي استراحة تريد معرفة معلومات عنها.",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const fetchData = async () => {
    const startTime = performance.now()
    setLoading(true)

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result || result.ok !== true) {
        throw new Error("استجابة غير متوقعة من الخادم")
      }

      const rows = Array.isArray(result.data) ? result.data : []
      setData(rows)
      setLastUpdated(new Date())

      const loadTime = Math.round(performance.now() - startTime)
      setStats({ total: rows.length, loadTime })

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحميل ${rows.length} عنصر`,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "خطأ في التحميل",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setChatLoading(true)

    try {
      const response = await fetch(CHATBOT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          message: userMessage.content,
          context: data.slice(0, 10), // Send first 10 items as context
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: result.response || result.message || "عذراً، لم أتمكن من فهم طلبك. حاول مرة أخرى.",
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const filteredAndSortedData = useMemo(() => {
    let filtered = data

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = data.filter((item) =>
        Object.values(item).some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        ),
      )
    }

    // Sort data
    filtered.sort((a, b) => {
      if (sortBy === "row_number") {
        return (Number(a.row_number) || 0) - (Number(b.row_number) || 0)
      }

      const aValue = String(a[sortBy as keyof RestArea] || a["الاسم"] || "")
      const bValue = String(b[sortBy as keyof RestArea] || b["الاسم"] || "")

      return aValue.localeCompare(bValue, "ar", { numeric: true, sensitivity: "base" })
    })

    return filtered
  }, [data, searchQuery, sortBy])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "تم النسخ",
        description: "تم نسخ الرقم إلى الحافظة",
      })
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "لم يتم نسخ الرقم",
        variant: "destructive",
      })
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">نظام إدارة الاستراحات</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">إدارة واستعلام عن قائمة الاستراحات</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                <Building2 className="h-3 w-3" />
                {filteredAndSortedData.length} عنصر
              </Badge>

              {lastUpdated && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  آخر تحديث: {lastUpdated.toLocaleTimeString("ar-EG")}
                </Badge>
              )}

              <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="relative bg-transparent">
                    <MessageCircle className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md h-[600px] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      مساعد الاستراحات الذكي
                    </DialogTitle>
                  </DialogHeader>

                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === "user" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.type === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <span className="text-xs opacity-70 mt-1 block">
                              {message.timestamp.toLocaleTimeString("ar-EG")}
                            </span>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-end">
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 pt-4 border-t">
                    <Textarea
                      placeholder="اسأل عن أي استراحة..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendChatMessage()
                        }
                      }}
                      className="min-h-[40px] max-h-[100px]"
                    />
                    <Button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">تبديل المظهر</span>
              </Button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="البحث في الاسم، الهاتف، العنوان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الاسم">الاسم</SelectItem>
                  <SelectItem value="العنوان">العنوان</SelectItem>
                  <SelectItem value="row_number">رقم الصف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchData} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white dark:bg-slate-800 shadow-md">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedData.length === 0 ? (
          <Card className="text-center py-12 bg-white dark:bg-slate-800 shadow-md">
            <CardContent>
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">لا توجد نتائج</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery ? "جرّب كلمة بحث مختلفة أو امسح حقل البحث" : "لا توجد بيانات متاحة"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedData.map((item, index) => (
              <Card
                key={index}
                className="hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:scale-105"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    {highlightText(item["الاسم"] || "بدون اسم", searchQuery)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Phone className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">الهاتف: </span>
                      <span className="text-slate-900 dark:text-white">
                        {highlightText(item["رقم الهاتف"] || "—", searchQuery)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">العنوان: </span>
                      <span className="text-slate-900 dark:text-white">
                        {highlightText(item["العنوان"] || "—", searchQuery)}
                      </span>
                    </div>
                  </div>

                  {item["ملاحظات إضافية"] && (
                    <div className="text-sm bg-slate-50 dark:bg-slate-700 p-2 rounded">
                      <span className="font-medium text-slate-700 dark:text-slate-300">ملاحظات: </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {highlightText(item["ملاحظات إضافية"], searchQuery)}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    رقم الصف: {item["row_number"] || "—"}
                  </div>

                  <div className="flex gap-2 pt-2 flex-wrap">
                    {item["رقم الهاتف"] && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          asChild
                        >
                          <a href={`tel:${item["رقم الهاتف"].replace(/\s+/g, "")}`}>
                            <Phone className="h-3 w-3" />
                            اتصال
                          </a>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          onClick={() => copyToClipboard(item["رقم الهاتف"])}
                        >
                          <Copy className="h-3 w-3" />
                          نسخ
                        </Button>
                      </>
                    )}

                    {item["رابط الفيسبوك"] && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        asChild
                      >
                        <a href={item["رابط الفيسبوك"]} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-3 w-3" />
                          فيسبوك
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span>العناصر المحملة: {stats.total}</span>
              <span>زمن التحميل: {stats.loadTime}ms</span>
            </div>
            <div>© 2024 نظام إدارة الاستراحات</div>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  )
}
