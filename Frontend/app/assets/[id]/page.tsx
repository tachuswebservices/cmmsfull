import { MainLayout } from '@/components/layout/main-layout'
import { AssetDetailsPage } from '@/components/assets/asset-details-page'

export default async function AssetDetailsRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <AssetDetailsPage assetId={id} />
    </MainLayout>
  )
}

