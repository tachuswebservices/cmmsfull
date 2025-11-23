"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Check } from "lucide-react"

interface ScheduleTaskFormProps {
  onSave: (task: any) => void;
  onCancel: () => void;
  task?: any;
  assets: any[];
  users: any[];
}

export function ScheduleTaskForm({ onSave, onCancel, task, assets, users }: ScheduleTaskFormProps) {
  const [formData, setFormData] = useState(
    task || {
      title: '',
      asset: '',
      description: '',
      assignedTo: '',
      assignedToId: '',
      frequency: '',
      category: '',
      startDate: new Date().toISOString().split('T')[0],
    }
  );
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        startDate: (task as any).startDate || new Date().toISOString().split('T')[0],
      });
    }
  }, [task]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSelectChange = (id: string, value: string) => {
    // special handling for assignedTo selector: value is user.id
    if (id === 'assignedTo') {
      const selected = users.find(u => u.id === value)
      setFormData({
        ...formData,
        assignedToId: selected?.id || '',
        assignedTo: selected?.name || '',
      })
      return
    }
    setFormData({ ...formData, [id]: value })
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { [k: string]: string } = {}
    if (!String(formData.title || '').trim()) nextErrors.title = 'Title is required'
    if (!String(formData.asset || '').trim()) nextErrors.asset = 'Asset is required'
    if (!String(formData.frequency || '').trim()) nextErrors.frequency = 'Frequency is required'
    if (!String((formData as any).startDate || '').trim()) nextErrors.startDate = 'Start date is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave(formData);
  };

  return (
    <div className="p-1 flex flex-col h-full">
      <Card className="border-none shadow-none flex-grow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Settings className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">{task ? "Edit Task" : "Schedule a New Task"}</CardTitle>
              <CardDescription>{task ? "Update the task details below." : "Fill in the details below to schedule a new task."}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" placeholder="e.g. Motor Lubrication" value={formData.title} onChange={handleChange} />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select onValueChange={(value) => handleSelectChange('asset', value)} value={formData.asset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.name}>{asset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.asset && <p className="text-sm text-red-600">{errors.asset}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="e.g. Apply grease to motor bearings and check alignment" value={formData.description} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select onValueChange={(value) => handleSelectChange('assignedTo', value)} value={formData.assignedToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select onValueChange={(value) => handleSelectChange('frequency', value)} value={formData.frequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.frequency && <p className="text-sm text-red-600">{errors.frequency}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="e.g. Lubrication, Cleaning" value={formData.category} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={formData.startDate} onChange={handleChange} />
                {errors.startDate && <p className="text-sm text-red-600">{errors.startDate}</p>}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 p-4 bg-slate-50 mt-auto -m-1 rounded-b-lg">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white" type="submit" onClick={handleSubmit}>
          <Check className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
