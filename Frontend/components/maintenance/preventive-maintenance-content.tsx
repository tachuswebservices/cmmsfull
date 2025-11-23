"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader as ADHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { PlusCircle } from "lucide-react"
import { ScheduleTaskForm } from "./schedule-task-form"
import { useState, useEffect } from "react"
import { AssetService } from "@/lib/services/asset-service"
import { UserService } from "@/lib/services/user-service"
import { PreventiveService } from "@/lib/services/preventive-service"
import { useHasAny } from "@/hooks/use-permissions"

type Task = {
  id: string;
  title: string;
  description: string;
  asset: string;
  assignedTo: string;
  assignedToId?: string;
  status: 'Overdue' | 'Upcoming';
  nextDueDate: string;
  frequency: string;
  category: string;
  lastDone: string;
};

export function PreventiveMaintenanceContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const canManagePm = useHasAny(['pm.manage'])

  useEffect(() => {
    const loadData = async () => {
      const assetsData = await AssetService.getAssets()
      const usersData = await UserService.getUsers()
      setAssets(assetsData)
      setUsers(usersData)
      await loadTasks()
    }
    loadData()
  }, [])

  const loadTasks = async () => {
    const backendTasks = await PreventiveService.list()
    const uiTasks: Task[] = backendTasks.map((t: any) => {
      const nextDue = t.nextDue ? new Date(t.nextDue) : new Date()
      const status: 'Overdue' | 'Upcoming' = nextDue.getTime() < Date.now() ? 'Overdue' : 'Upcoming'
      const assetName = assets.find(a => a.id === t.assetId)?.name || t.assetId
      const assignedName = t.assignedToName || users.find(u => u.id === t.assignedToId)?.name || ''
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        asset: assetName,
        assignedTo: assignedName,
        assignedToId: t.assignedToId,
        status,
        nextDueDate: nextDue.toISOString().split('T')[0],
        frequency: String(t.frequency || '').toLowerCase(),
        category: t.category || '',
        lastDone: (t.lastCompleted ? new Date(t.lastCompleted) : new Date()).toISOString().split('T')[0],
      }
    })
    setTasks(uiTasks)
  }

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'status' | 'lastDone'>) => {
    const assetId = assets.find(a => a.name === newTask.asset)?.id || newTask.asset
    await PreventiveService.create({
      assetId,
      title: newTask.title,
      description: newTask.description,
      assignedToName: newTask.assignedTo,
      assignedToId: (newTask as any).assignedToId,
      frequency: String(newTask.frequency || '').toUpperCase(),
      category: newTask.category,
      // Anchor schedule using startDate; backend will compute nextDue from createdAt
      startDate: (newTask as any).startDate,
    })
    await loadTasks()
    setIsFormDialogOpen(false)
  }

  const handleEditTask = async (updatedTask: Task) => {
    const assetId = assets.find(a => a.name === updatedTask.asset)?.id
    await PreventiveService.update(updatedTask.id, {
      title: updatedTask.title,
      description: updatedTask.description,
      assignedToName: updatedTask.assignedTo,
      assignedToId: (updatedTask as any).assignedToId,
      frequency: String(updatedTask.frequency || '').toUpperCase() as any,
      category: updatedTask.category,
      ...(assetId ? { assetId } : {}),
    })
    await loadTasks()
    setEditingTask(null)
    setIsFormDialogOpen(false)
    setIsDetailsDialogOpen(false)
  }

  const confirmDelete = async () => {
    if (!selectedTask) return
    await PreventiveService.delete(selectedTask.id)
    await loadTasks()
    setIsDetailsDialogOpen(false)
    setSelectedTask(null)
    setDeleteDialogOpen(false)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Preventive Maintenance</h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          {canManagePm && (
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTask(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Schedule Task
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Schedule New Task'}</DialogTitle>
            </DialogHeader>
            <ScheduleTaskForm 
              onSave={editingTask ? handleEditTask : handleAddTask} 
              onCancel={() => {
                setIsFormDialogOpen(false)
                setEditingTask(null)
              }}
              task={editingTask}
              assets={assets}
              users={users}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className="card-hover" onClick={() => handleTaskClick(task)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 h-6 w-6"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span>Asset: {task.asset}</span> | <span>Assigned: {task.assignedTo}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${task.status === 'Overdue' ? 'text-red-500' : 'text-green-500'}`}>
                  {task.status === 'Overdue' && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
                  {task.status}
                </div>
                <p className="text-xs text-muted-foreground">Next: {new Date(task.nextDueDate).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-2 justify-end">
                    <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">{task.frequency}</span>
                    <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">{task.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last done: {new Date(task.lastDone).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Description</h4>
                <p>{selectedTask.description}</p>
              </div>
              <div>
                <h4 className="font-semibold">Asset</h4>
                <p>{selectedTask.asset}</p>
              </div>
              <div>
                <h4 className="font-semibold">Assigned To</h4>
                <p>{selectedTask.assignedTo}</p>
              </div>
              <div>
                <h4 className="font-semibold">Frequency</h4>
                <p>{selectedTask.frequency}</p>
              </div>
              <div>
                <h4 className="font-semibold">Category</h4>
                <p>{selectedTask.category}</p>
              </div>
              <div>
                <h4 className="font-semibold">Next Due Date</h4>
                <p>{new Date(selectedTask.nextDueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <h4 className="font-semibold">Last Done</h4>
                <p>{new Date(selectedTask.lastDone).toLocaleDateString()}</p>
              </div>
              <div className="flex justify-end">
                {canManagePm && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setEditingTask(selectedTask)
                      setIsDetailsDialogOpen(false)
                      setIsFormDialogOpen(true)
                    }}>Edit Task</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <ADHeader>
            <AlertDialogTitle>Delete preventive task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task "{selectedTask?.title}" will be permanently deleted.
            </AlertDialogDescription>
          </ADHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
