import { MainLayout } from '@/components/layout/main-layout'
import { InventoryDetailsPage } from '@/components/inventory/inventory-details-page'

export default function InventoryDetailsRoute({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <MainLayout>
      <InventoryDetailsPage id={id} />
    </MainLayout>
  )
}
