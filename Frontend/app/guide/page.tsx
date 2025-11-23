'use client'

import { useState, useMemo, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { DocumentService, type Doc } from '@/lib/services/document-service'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export default function GuidePage() {
  const { toast } = useToast()
  const [docs, setDocs] = useState<Doc[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addDesc, setAddDesc] = useState('')
  const [addFiles, setAddFiles] = useState<File[]>([])
  const [editing, setEditing] = useState<Doc | null>(null)
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    const unsub = DocumentService.subscribe((items) => {
      setDocs(items)
    })
    return unsub
  }, [])

  const totalSize = useMemo(() => addFiles.reduce((sum, f) => sum + (f?.size || 0), 0), [addFiles])
  function formatBytes(bytes: number) {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const val = bytes / Math.pow(1024, i)
    return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${units[i]}`
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return docs
    return docs.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [docs, searchQuery])

  return (
    <MainLayout>
      <div className="flex h-screen">
        {/* Card list and controls */}
        <div className="w-full p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Documents</h1>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Document</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Document</DialogTitle>
                  <DialogDescription>Provide a description and attach one or more PDF files.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Textarea placeholder="Description (optional)" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
                  <Input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      if (files.length === 0) return
                      setAddFiles((prev) => {
                        const map = new Map<string, File>()
                        const all = [...prev, ...files]
                        for (const f of all) {
                          // Create a stable key to avoid duplicates across selections
                          const key = `${f.name}__${f.size}__${(f as any).lastModified ?? ''}`
                          if (!map.has(key)) map.set(key, f)
                        }
                        return Array.from(map.values())
                      })
                      // allow re-selecting the same file again if needed
                      e.currentTarget.value = ''
                    }}
                  />
                  {addFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-600 dark:text-slate-400">Selected files ({addFiles.length}, total {formatBytes(totalSize)}):</div>
                      <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                        {addFiles.map((f, idx) => (
                          <li key={`${f.name}-${f.size}-${(f as any).lastModified ?? idx}`} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">
                              {f.name}
                              <span className="ml-2 text-xs text-slate-500">({formatBytes(f.size)})</span>
                            </span>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAddFiles(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                          </li>
                        ))}
                      </ul>
                      <div>
                        <Button size="sm" variant="outline" onClick={() => setAddFiles([])}>Clear all</Button>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      try {
                        if (addFiles.length === 0) {
                          toast({ title: 'Select files', description: 'Please choose at least one PDF', variant: 'destructive' })
                          return
                        }
                        const created = await DocumentService.create({ description: addDesc, files: addFiles })
                        toast({ title: 'Document created', description: created.name })
                        setAddDesc('')
                        setAddFiles([])
                        setAddOpen(false)
                      } catch (err: any) {
                        toast({ title: 'Create failed', description: String(err?.message || err), variant: 'destructive' })
                      }
                    }}
                  >Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            {filteredFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFiles.map((d) => (
                  <Card key={d.id} className={`p-3 space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.name}</p>
                        {d.description ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{d.description}</p>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No description</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">{d.attachments.length} attachment(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={!!editing && editing.id === d.id} onOpenChange={(open) => {
                        if (open) { setEditing(d); setEditDesc(d.description || '') } else { setEditing(null) }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => { setEditing(d); setEditDesc(d.description || '') }}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Description</DialogTitle>
                          </DialogHeader>
                          <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button onClick={async () => {
                              try {
                                const updated = await DocumentService.updateDescription(d.id, editDesc)
                                setEditing(null)
                                toast({ title: 'Updated', description: 'Description saved' })
                              } catch (err: any) {
                                toast({ title: 'Update failed', description: String(err?.message || err), variant: 'destructive' })
                              }
                            }}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{d.name}" and all attachments. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              try {
                                await DocumentService.remove(d.id)
                                toast({ title: 'Deleted', description: `${d.name} removed` })
                              } catch (err: any) {
                                toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' })
                              }
                            }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">
                {docs.length > 0
                  ? 'No documents match your search.'
                  : 'No documents yet. Add one to get started.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
