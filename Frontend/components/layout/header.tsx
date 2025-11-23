'use client'

import { Bell, Menu, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { NotificationService, type NotificationItem } from '@/lib/services/notification-service'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])

  const unreadCount = useMemo(() => items.filter(i => !i.readAt).length, [items])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const res = await NotificationService.list()
      setItems(res.items || [])
    } catch {
      // no-op
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // initial load
    loadNotifications()
    // optional: poll every 60s
    const t = setInterval(loadNotifications, 60000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="bg-black border-b border-emerald-600/60 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div>
            {/* <h1 className="text-xl font-bold text-white">
            Hill Point
            </h1> */}
            <p className="hidden sm:block text-sm text-slate-300">
              Empowering The Factories Of The Future
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white font-semibold">Hill Point</span>

          {/* Notifications */}
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) loadNotifications() }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-none">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-semibold">Notifications</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await NotificationService.markAllRead(); await loadNotifications() }}
                disabled={unreadCount === 0 || loading}
              >
                Mark all read
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-sm text-slate-500">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No notifications</div>
              ) : (
                <ul className="divide-y">
                  {items.map((n) => (
                    <li key={n.id} className={`p-3 hover:bg-slate-50 ${!n.readAt ? 'bg-slate-50/60' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          {n.body && <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>}
                          <p className="text-[11px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                        {!n.readAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => { await NotificationService.markRead(n.id); setItems(prev => prev.map(it => it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it)) }}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
          {/* User (no dropdown) */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white">
            <User className="h-5 w-5" />
            <span className="hidden md:inline">{user?.name || user?.email}</span>
          </div>
          {/* Logout (icon only) */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-white bg-transparent border-white/20 hover:bg-white/10 hover:text-white hover:border-white/30"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
