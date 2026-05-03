import { MOCK_ADVERTISERS } from './mock-advertisers'
import type { AdvertiserAsset, SelectedAdvertiser } from '@/types'

export function getAdvertiserLibraryWithSelection(
  selectedAdvertiser?: SelectedAdvertiser
): Array<AdvertiserAsset & { selected: boolean; matchReason?: string }> {
  return MOCK_ADVERTISERS.map(asset => ({
    ...asset,
    selected: selectedAdvertiser?.id === asset.id,
    matchReason: selectedAdvertiser?.id === asset.id ? selectedAdvertiser.matchReason : undefined,
  }))
}
