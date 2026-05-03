import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getAdvertiserLibraryWithSelection } from '../lib/ad-library'

describe('ad library helpers', () => {
  it('marks the AI-selected advertiser and preserves the match reason', () => {
    const library = getAdvertiserLibraryWithSelection({
      id: 'game-mystery-room',
      industry: '游戏娱乐',
      brandName: '暗门档案',
      productName: '密室推理手游',
      matchReason: '当前视频包含悬疑线索和高张力转场，适合互动推理广告。',
    })

    const selected = library.filter(item => item.selected)
    assert.equal(selected.length, 1)
    assert.equal(selected[0].brandName, '暗门档案')
    assert.equal(selected[0].industry, '游戏娱乐')
    assert.match(selected[0].matchReason ?? '', /悬疑线索/)
  })
})
