
import { Tile, TileType, Card, CardType, MarketCycle } from './types';

export const INITIAL_MONEY = 5000000;
export const GO_SALARY = 500000;
export const JAIL_FINE = 300000;
export const TOTAL_TILES = 32;

// Cycle Parameters
export const CYCLE_CONFIG = {
  [MarketCycle.DEPRESSION]: { label: '經濟蕭條', color: 'text-blue-500', min: -0.30, max: -0.10 },
  [MarketCycle.RECESSION]:  { label: '經濟衰退', color: 'text-cyan-500', min: -0.15, max: -0.05 },
  [MarketCycle.RECOVERY]:   { label: '經濟復甦', color: 'text-orange-500', min: 0.05, max: 0.15 },
  [MarketCycle.EXPANSION]:  { label: '經濟擴張', color: 'text-red-500', min: 0.10, max: 0.30 },
};

export const TILES_DATA: Tile[] = [
  { id: 0, name: 'IPO 起點', code: 'START', type: TileType.GO, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-gray-200' },
  
  // Bottom Row (Tech & Semis)
  { id: 1, name: '聯電', code: '2303', type: TileType.PROPERTY, basePrice: 50000, currentPrice: 50000, priceHistory: [], upgradeCost: 40000, groupColor: 'bg-blue-800', buildingLevel: 0 },
  { id: 2, name: '命運', code: 'DESTINY', type: TileType.DESTINY, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-blue-200' },
  { id: 3, name: '台積電', code: '2330', type: TileType.PROPERTY, basePrice: 60000, currentPrice: 60000, priceHistory: [], upgradeCost: 50000, groupColor: 'bg-blue-800', buildingLevel: 0 },
  { id: 4, name: '證交稅', code: 'TAX', type: TileType.TAX, basePrice: 0, currentPrice: 0, priceHistory: [], rent: [300000], buildingLevel: 0, groupColor: 'bg-gray-400' },
  { id: 5, name: '鴻海', code: '2317', type: TileType.PROPERTY, basePrice: 100000, currentPrice: 100000, priceHistory: [], upgradeCost: 80000, groupColor: 'bg-blue-600', buildingLevel: 0 },
  { id: 6, name: '機會', code: 'CHANCE', type: TileType.CHANCE, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-orange-200' },
  { id: 7, name: '廣達', code: '2382', type: TileType.PROPERTY, basePrice: 100000, currentPrice: 100000, priceHistory: [], upgradeCost: 80000, groupColor: 'bg-blue-600', buildingLevel: 0 },
  { id: 8, name: '聯發科', code: '2454', type: TileType.PROPERTY, basePrice: 120000, currentPrice: 120000, priceHistory: [], upgradeCost: 100000, groupColor: 'bg-blue-600', buildingLevel: 0 },

  // Left Column (Finance & Traditional)
  { id: 9, name: '看守所', code: 'JAIL', type: TileType.JAIL, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-gray-400' },
  { id: 10, name: '富邦金', code: '2881', type: TileType.PROPERTY, basePrice: 140000, currentPrice: 140000, priceHistory: [], upgradeCost: 100000, groupColor: 'bg-emerald-600', buildingLevel: 0 },
  { id: 11, name: '國泰金', code: '2882', type: TileType.PROPERTY, basePrice: 140000, currentPrice: 140000, priceHistory: [], upgradeCost: 100000, groupColor: 'bg-emerald-600', buildingLevel: 0 },
  { id: 12, name: '中信金', code: '2891', type: TileType.PROPERTY, basePrice: 160000, currentPrice: 160000, priceHistory: [], upgradeCost: 120000, groupColor: 'bg-emerald-600', buildingLevel: 0 },
  { id: 13, name: '統一', code: '1216', type: TileType.PROPERTY, basePrice: 180000, currentPrice: 180000, priceHistory: [], upgradeCost: 140000, groupColor: 'bg-amber-600', buildingLevel: 0 },
  { id: 14, name: '台塑', code: '1301', type: TileType.PROPERTY, basePrice: 180000, currentPrice: 180000, priceHistory: [], upgradeCost: 140000, groupColor: 'bg-amber-600', buildingLevel: 0 },
  { id: 15, name: '中鋼', code: '2002', type: TileType.PROPERTY, basePrice: 200000, currentPrice: 200000, priceHistory: [], upgradeCost: 150000, groupColor: 'bg-amber-600', buildingLevel: 0 },

  // Top Row (Shipping & Energy)
  { id: 16, name: '環島旅行', code: 'TOUR', type: TileType.PARKING, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-white' },
  { id: 17, name: '長榮', code: '2603', type: TileType.PROPERTY, basePrice: 220000, currentPrice: 220000, priceHistory: [], upgradeCost: 180000, groupColor: 'bg-cyan-600', buildingLevel: 0 },
  { id: 18, name: '命運', code: 'DESTINY', type: TileType.DESTINY, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-blue-200' },
  { id: 19, name: '陽明', code: '2609', type: TileType.PROPERTY, basePrice: 220000, currentPrice: 220000, priceHistory: [], upgradeCost: 180000, groupColor: 'bg-cyan-600', buildingLevel: 0 },
  { id: 20, name: '萬海', code: '2615', type: TileType.PROPERTY, basePrice: 240000, currentPrice: 240000, priceHistory: [], upgradeCost: 200000, groupColor: 'bg-cyan-600', buildingLevel: 0 },
  { id: 21, name: '台泥', code: '1101', type: TileType.PROPERTY, basePrice: 260000, currentPrice: 260000, priceHistory: [], upgradeCost: 220000, groupColor: 'bg-stone-500', buildingLevel: 0 },
  { id: 22, name: '亞泥', code: '1102', type: TileType.PROPERTY, basePrice: 260000, currentPrice: 260000, priceHistory: [], upgradeCost: 220000, groupColor: 'bg-stone-500', buildingLevel: 0 },
  { id: 23, name: '台玻', code: '1802', type: TileType.PROPERTY, basePrice: 280000, currentPrice: 280000, priceHistory: [], upgradeCost: 240000, groupColor: 'bg-stone-500', buildingLevel: 0 },
  { id: 24, name: '違法交割', code: 'TO_JAIL', type: TileType.TO_JAIL, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-gray-400' },

  // Right Column (Telco & Others)
  { id: 25, name: '中華電', code: '2412', type: TileType.PROPERTY, basePrice: 300000, currentPrice: 300000, priceHistory: [], upgradeCost: 250000, groupColor: 'bg-purple-600', buildingLevel: 0 },
  { id: 26, name: '台灣大', code: '3045', type: TileType.PROPERTY, basePrice: 300000, currentPrice: 300000, priceHistory: [], upgradeCost: 250000, groupColor: 'bg-purple-600', buildingLevel: 0 },
  { id: 27, name: '遠傳', code: '4904', type: TileType.PROPERTY, basePrice: 320000, currentPrice: 320000, priceHistory: [], upgradeCost: 260000, groupColor: 'bg-purple-600', buildingLevel: 0 },
  { id: 28, name: '機會', code: 'CHANCE', type: TileType.CHANCE, basePrice: 0, currentPrice: 0, priceHistory: [], buildingLevel: 0, groupColor: 'bg-orange-200' },
  { id: 29, name: '大立光', code: '3008', type: TileType.PROPERTY, basePrice: 350000, currentPrice: 350000, priceHistory: [], upgradeCost: 300000, groupColor: 'bg-pink-600', buildingLevel: 0 },
  { id: 30, name: '奢侈稅', code: 'TAX', type: TileType.TAX, basePrice: 0, currentPrice: 0, priceHistory: [], rent: [300000], buildingLevel: 0, groupColor: 'bg-gray-400' },
  { id: 31, name: '信義房屋', code: '9940', type: TileType.PROPERTY, basePrice: 400000, currentPrice: 400000, priceHistory: [], upgradeCost: 350000, groupColor: 'bg-pink-600', buildingLevel: 0 },
];

export const CHANCE_CARDS: Card[] = [
  { id: 1, title: "股票漲停", description: "投資獲利 $500,000", type: CardType.MONEY_ADD, value: 500000 },
  { id: 2, title: "收購權證", description: "下一次消費後，可免費獲得該公司股權 (直到下一級)", type: CardType.FREE_ACQUIRE },
  { id: 3, title: "財報大利多", description: "名下隨機一支股票，股價暴漲 50%!", type: CardType.STOCK_BUMP, value: 0.50 },
  { id: 4, title: "財報利多", description: "名下隨機一支股票，股價上漲 15%!", type: CardType.STOCK_BUMP, value: 0.15 },
  { id: 5, title: "景氣復甦", description: "市場進入復甦期，股價看漲。", type: CardType.CYCLE_CHANGE, cycleType: MarketCycle.RECOVERY },
  { id: 6, title: "免稅天堂", description: "獲得一張免過路費卡", type: CardType.FREE_RENT },
  { id: 7, title: "參加環島旅行", description: "前往環島 (ID: 16)", type: CardType.MOVE_TO, targetId: 16 },
  { id: 8, title: "景氣擴張", description: "市場進入擴張期，全線飆漲！", type: CardType.CYCLE_CHANGE, cycleType: MarketCycle.EXPANSION },
  { id: 9, title: "被金管會約談", description: "暫停一回合", type: CardType.STOP_TURN },
  { id: 10, title: "比特幣暴漲", description: "獲得 $400,000", type: CardType.MONEY_ADD, value: 400000 },
];

export const DESTINY_CARDS: Card[] = [
  { id: 11, title: "補繳證交稅", description: "支付 $300,000", type: CardType.MONEY_SUB, value: 300000 },
  { id: 12, title: "財報大利空", description: "名下隨機一支股票，股價崩跌 50%!", type: CardType.STOCK_CRASH, value: 0.50 },
  { id: 13, title: "財報利空", description: "名下隨機一支股票，股價下跌 15%!", type: CardType.STOCK_CRASH, value: 0.15 },
  { id: 14, title: "經濟衰退", description: "市場進入衰退期，股價修正。", type: CardType.CYCLE_CHANGE, cycleType: MarketCycle.RECESSION },
  { id: 15, title: "經濟蕭條", description: "市場進入蕭條期，現金為王。", type: CardType.CYCLE_CHANGE, cycleType: MarketCycle.DEPRESSION },
  { id: 16, title: "國安基金護盤", description: "所有資產增值，獲得 $200,000", type: CardType.MONEY_ADD, value: 200000 },
  { id: 17, title: "內線交易罰款", description: "支付罰款 $100,000", type: CardType.MONEY_SUB, value: 100000 },
  { id: 18, title: "重啟IPO", description: "回到起點，領取薪水", type: CardType.MOVE_TO, targetId: 0 },
  { id: 19, title: "股災", description: "資產縮水，損失 $150,000", type: CardType.MONEY_SUB, value: 150000 },
  { id: 20, title: "配發股利", description: "獲得 $300,000", type: CardType.MONEY_ADD, value: 300000 },
];
