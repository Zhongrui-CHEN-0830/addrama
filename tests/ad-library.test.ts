import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getAdvertiserLibraryWithSelection } from '../lib/ad-library'

describe('ad library helpers', () => {
  it('marks the AI-selected advertiser and preserves the match reason', () => {
    const library = getAdvertiserLibraryWithSelection({
      id: 'travel-ctrip-package',
      industry: '在线旅游服务 / 旅游度假',
      brandName: '携程旅行',
      productName: '旅行套餐',
      matchReason: '当前视频包含机场与家庭出游线索，适合低打扰旅行套餐广告。',
    })

    const selected = library.filter(item => item.selected)
    assert.equal(selected.length, 1)
    assert.equal(selected[0].brandName, '携程旅行')
    assert.equal(selected[0].industry, '在线旅游服务 / 旅游度假')
    assert.match(selected[0].matchReason ?? '', /家庭出游线索/)
  })
})
