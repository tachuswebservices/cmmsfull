'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, CheckCircle } from 'lucide-react'
import { MissedPmService, type MissedPmDTO } from '@/lib/services/missed-pm-service'
import { useCan } from '@/hooks/use-permissions'
import { toast } from '@/hooks/use-toast'

export function MissedPmList() {
  const [items, setItems] = useState<MissedPmDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const canView = useCan('kpi.viewGlobal')

  const load = async () => {
    try {
      setLoading(true)
      const data = await MissedPmService.list()
      setItems(data)
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to load missed PMs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) return
    load()
  }, [canView])

  const handleResolve = async (id: string) => {
    try {
      setResolving(id)
      await MissedPmService.resolve(id)
      toast({ title: 'Resolved', description: 'Missed PM marked as completed late.' })
      await load()
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to resolve', variant: 'destructive' })
    } finally {
      setResolving(null)
    }
  }

  if (!canView) return null

  // Don't show anything if not loading and no items
  if (!loading && items.length === 0) return null

  if (loading) {
    return (
      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            Missed Preventive Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-rose-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          Missed Preventive Maintenance
          <Badge variant="destructive" className="ml-2">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => {
              const scheduled = new Date(item.scheduledDate)
              const isResolved = item.status === 'COMPLETED_LATE'
              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${isResolved ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      <Badge variant={isResolved ? 'default' : 'destructive'} className="text-[10px] h-5">
                        {isResolved ? 'Resolved' : 'Missed'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      Asset: {item.asset?.name || item.assetId}
                      {item.asset?.location ? ` · ${item.asset.location}` : ''}
                    </p>
                    <p className="text-xs text-slate-600">
                      Assigned: {item.assignedToName || 'Unassigned'} · Frequency: {item.frequency.toLowerCase()}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      Scheduled: {scheduled.toLocaleDateString()}
                    </div>
                  </div>
                  {!isResolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={resolving === item.id}
                      onClick={() => handleResolve(item.id)}
                    >
                      {resolving === item.id ? (
                        'Saving...'
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
      </CardContent>
    </Card>
  )
}
