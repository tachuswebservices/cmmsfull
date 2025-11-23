// Mock service for maintenance tasks - ready for database integration
export class MaintenanceService {
  static async getMaintenanceTasks() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 420))
    return tasksStore
  }

  static async createMaintenanceTask(task: any) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const id = `MT-${Date.now()}`
    const now = new Date()
    const nextDue = deriveNextDue(now, task.frequency)
    const newTask = {
      id,
      title: task.title || 'Preventive Task',
      description: task.description || '',
      asset: task.asset,
      frequency: task.frequency || 'monthly',
      category: task.category || 'General',
      assignedTo: task.assignedTo || '',
      lastCompleted: now,
      nextDue: nextDue,
      estimatedDuration: task.estimatedDuration || 60,
    }
    tasksStore = [...tasksStore, newTask]
    return { success: true, id }
  }

  static async updateMaintenanceTask(id: string, updates: any) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    tasksStore = tasksStore.map(t => t.id === id ? { ...t, ...normalizeTaskUpdates(t, updates) } : t)
    return { success: true }
  }

  static async completeMaintenanceTask(id: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    const now = new Date()
    tasksStore = tasksStore.map(t => t.id === id ? { ...t, lastCompleted: now, nextDue: deriveNextDue(now, t.frequency) } : t)
    return { success: true }
  }
}

// In-memory store seeded with demo data
type InternalTask = {
  id: string
  title: string
  description: string
  asset: string
  frequency: string
  category: string
  assignedTo: string
  lastCompleted: Date
  nextDue: Date
  estimatedDuration: number
}

let tasksStore: InternalTask[] = [
  // Conveyor Belt Motor (AST-001)
  {
    id: 'MT-001',
    title: 'Motor Lubrication',
    description: 'Apply grease to motor bearings and check alignment',
    asset: 'Conveyor Belt Motor',
    frequency: 'monthly',
    category: 'Preventive',
    assignedTo: 'Rajesh Kumar',
    lastCompleted: new Date('2025-08-01'),
    nextDue: new Date('2025-09-01'),
    estimatedDuration: 60
  },
  {
    id: 'MT-002',
    title: 'Alignment Check',
    description: 'Check motor-pulley alignment and correct if needed',
    asset: 'Conveyor Belt Motor',
    frequency: 'quarterly',
    category: 'Preventive',
    assignedTo: 'Priya Sharma',
    lastCompleted: new Date('2025-06-15'),
    nextDue: new Date('2025-09-15'),
    estimatedDuration: 45
  },
  {
    id: 'MT-003',
    title: 'Electrical Inspection',
    description: 'Inspect wiring, connections, and insulation',
    asset: 'Conveyor Belt Motor',
    frequency: 'weekly',
    category: 'Preventive',
    assignedTo: 'Amit Singh',
    lastCompleted: new Date('2025-08-15'),
    nextDue: new Date('2025-08-22'),
    estimatedDuration: 30
  },
  // Hydraulic Press (AST-002)
  {
    id: 'MT-004',
    title: 'Hydraulic Fluid Check',
    description: 'Check fluid levels, pressure, and inspect for leaks',
    asset: 'Hydraulic Press',
    frequency: 'weekly',
    category: 'Preventive',
    assignedTo: 'Sunita Patel',
    lastCompleted: new Date('2025-08-10'),
    nextDue: new Date('2025-08-17'),
    estimatedDuration: 30
  },
  {
    id: 'MT-005',
    title: 'Safety Valve Testing',
    description: 'Test safety valves and pressure relief systems',
    asset: 'Hydraulic Press',
    frequency: 'monthly',
    category: 'Preventive',
    assignedTo: 'Vikram Gupta',
    lastCompleted: new Date('2025-07-25'),
    nextDue: new Date('2025-08-25'),
    estimatedDuration: 90
  },
  {
    id: 'MT-006',
    title: 'Pressure Calibration',
    description: 'Calibrate pressure sensors and verify readings',
    asset: 'Hydraulic Press',
    frequency: 'quarterly',
    category: 'Preventive',
    assignedTo: 'Anita Reddy',
    lastCompleted: new Date('2025-05-20'),
    nextDue: new Date('2025-08-20'),
    estimatedDuration: 120
  }
]

function deriveNextDue(from: Date, frequency: string): Date {
  const d = new Date(from.getTime())
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'yearly':
    case 'annually':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setMonth(d.getMonth() + 1)
  }
  return d
}

function normalizeTaskUpdates(orig: InternalTask, updates: any): InternalTask {
  const merged = { ...orig, ...updates }
  if (updates.frequency) {
    merged.nextDue = deriveNextDue(new Date(), updates.frequency)
  }
  return merged
}
