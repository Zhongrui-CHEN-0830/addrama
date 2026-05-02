import type { MockAd } from '@/types'

export const MOCK_ADS: MockAd[] = [
  {
    id: 'ad_001',
    category: '贷款',
    title: '最高借 20 万，秒到账',
    subtitle: '手续简单，随借随还，利率低至 0.02%/日',
    durationSec: 30,
    bgColor: '#1a0a0a',
  },
  {
    id: 'ad_002',
    category: '洗衣液',
    title: 'XX 洗衣液，深层去污',
    subtitle: '98% 用户推荐，一次用量，全家干净',
    durationSec: 15,
    bgColor: '#0a0e1a',
  },
  {
    id: 'ad_003',
    category: '手游',
    title: '全新 MMO 大作，立即下载',
    subtitle: '千万玩家同服，开服礼包免费领',
    durationSec: 30,
    bgColor: '#0a0a1a',
  },
  {
    id: 'ad_004',
    category: '汽车',
    title: '某品牌 SUV，限时优惠',
    subtitle: '7 座豪华配置，最高优惠 5 万元',
    durationSec: 60,
    bgColor: '#0a0a0a',
  },
  {
    id: 'ad_005',
    category: '房产',
    title: 'XX 楼盘，圆你安家梦',
    subtitle: '首付 2 成起，地铁 500 米，名校学区',
    durationSec: 30,
    bgColor: '#0e0a14',
  },
]

export function getRandomAd(): MockAd {
  return MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]
}
