// Mock service for reports - ready for database integration
export class ReportsService {
  static async getReportData(period: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 450))
    
    return {
      totalMaintenanceCost: 245000,
      completedWorkOrders: 89,
      assetUptime: 94.5,
      preventiveTasks: 156,
      maintenanceCostTrend: [
        { label: 'Jan', cost: 32000 },
        { label: 'Feb', cost: 28000 },
        { label: 'Mar', cost: 35000 },
        { label: 'Apr', cost: 30000 },
        { label: 'May', cost: 38000 },
        { label: 'Jun', cost: 42000 },
        { label: 'Jul', cost: 40000 },
        { label: 'Aug', cost: 45000 },
        { label: 'Sep', cost: 39000 },
        { label: 'Oct', cost: 37000 },
        { label: 'Nov', cost: 41000 },
        { label: 'Dec', cost: 46000 }
      ],
      workOrderStatus: {
        completed: 89,
        inProgress: 23,
        pending: 12
      },
      topAssets: [
        { name: 'Conveyor Motor CM-001', id: 'AST-001', uptime: 98.5 },
        { name: 'Hydraulic Press HP-003', id: 'AST-002', uptime: 96.2 },
        { name: 'Air Compressor AC-002', id: 'AST-003', uptime: 94.8 },
        { name: 'CNC Machine CNC-001', id: 'AST-004', uptime: 92.1 }
      ],
      maintenanceCategories: [
        { name: 'Preventive', percentage: 45 },
        { name: 'Corrective', percentage: 30 },
        { name: 'Emergency', percentage: 15 },
        { name: 'Inspection', percentage: 10 }
      ]
    }
  }

  static async exportReport(reportType: string, period: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    console.log('Exporting report:', reportType, period)
    return { success: true, downloadUrl: '/reports/export.pdf' }
  }
}
