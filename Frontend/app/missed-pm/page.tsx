'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { MissedPmList } from '@/components/maintenance/missed-pm-list'
import { RequirePermission } from '@/components/auth/require-permission'

export default function MissedPmPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['kpi.viewGlobal']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to view missed preventive maintenance.</div>}>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Missed Preventive Maintenance</h1>
            <p className="text-sm text-slate-600 mt-1">
              View and manage preventive maintenance tasks that were missed.
            </p>
          </div>
          <MissedPmList />
        </div>
      </RequirePermission>
    </MainLayout>
  )
}
