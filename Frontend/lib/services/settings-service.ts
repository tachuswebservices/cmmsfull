// Mock service for settings - ready for database integration
export class SettingsService {
  static async getSettings() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    return {
      general: {
        companyName: 'Acme Manufacturing Pvt Ltd',
        industry: 'manufacturing',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        autoAssign: true,
        preventiveAlerts: true,
        inventoryAlerts: true
      },
      notifications: {
        workOrderEmails: true,
        maintenanceEmails: true,
        inventoryEmails: true,
        urgentPush: true,
        assetFailurePush: true,
        dailySummaryTime: '09:00',
        weeklyReportDay: 'monday'
      },
      security: {
        strongPasswords: true,
        passwordExpiry: false,
        sessionTimeout: '60',
        maxLoginAttempts: '5',
        twoFactorAuth: false,
        ipRestriction: false,
        auditLogging: true
      }
    }
  }

  static async updateSettings(section: string, settings: any) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    console.log('Updating settings:', section, settings)
    return { success: true }
  }
}
