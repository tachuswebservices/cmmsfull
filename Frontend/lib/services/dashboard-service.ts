// Mock service for dashboard data - ready for database integration
export class DashboardService {
  static async getDashboardData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    return {
      activeWorkOrders: 34,
      totalAssets: 125,
      maintenanceDue: 8,
      inventoryValue: 78500,
      totalOperators: 12,
      preventiveMaintenance: [
        {
          id: 1,
          title: 'Monthly HVAC Inspection',
          asset: 'HVAC-01',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          title: 'Quarterly Generator Check',
          asset: 'GEN-02',
          dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          title: 'Annual Fire Extinguisher Test',
          asset: 'FIRE-EXT-05',
          dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
        }
      ],
      recentActivity: [
        {
          id: 1,
          type: 'completed',
          title: 'Work Order #1024 Completed',
          description: 'Routine check on hotpress system.',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
          id: 2,
          type: 'urgent',
          title: 'New Urgent Work Order #1025',
          description: 'Critical failure in packaging machine.',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
          id: 3,
          type: 'scheduled',
          title: 'Work Order #1023 In Progress',
          description: 'Scheduled monthly maintenance for Vitap Grooving.',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
        }
      ],
      alerts: [
        {
          id: 1,
          title: 'Low Inventory Alert',
          description: 'Bearing stock is running low (5 units remaining)',
          priority: 'high'
        },
        {
          id: 2,
          title: 'Warranty Expiring',
          description: 'Compressor warranty expires in 15 days',
          priority: 'medium'
        },
        {
          id: 3,
          title: 'Overdue Maintenance',
          description: '3 preventive maintenance tasks are overdue',
          priority: 'high'
        }
      ]
    }
  }
}
