
import { Tile, Player, TileType, MarketCycle } from '../types';
import { TILES_DATA, CYCLE_CONFIG } from '../constants';

// New Market Cycle Logic
export const updateStockPricesByCycle = (tiles: Tile[], cycle: MarketCycle): Tile[] => {
  const config = CYCLE_CONFIG[cycle];
  
  return tiles.map(tile => {
    if (tile.type !== TileType.PROPERTY) return tile;

    // Random fluctuation within the cycle's range
    const changePercent = Math.random() * (config.max - config.min) + config.min;
    
    // Apply change
    let newPrice = tile.currentPrice * (1 + changePercent);
    
    // Clamp: Min 20% of Base, Max 800% of Base
    newPrice = Math.max(tile.basePrice * 0.2, Math.min(tile.basePrice * 8, newPrice));
    
    const history = [...tile.priceHistory, tile.currentPrice].slice(-10);

    return {
      ...tile,
      currentPrice: Math.floor(newPrice),
      priceHistory: history
    };
  });
};

export const getEquityPercentage = (level: number): number => {
  switch (level) {
    case 0: return 0.10;
    case 1: return 0.30;
    case 2: return 0.50;
    case 3: return 0.70;
    case 4: return 1.00;
    default: return 0;
  }
};

export const calculateRevenue = (tile: Tile, tiles: Tile[], players: Player[]): number => {
  if (tile.type !== TileType.PROPERTY) return 0;
  
  // Rule 1: If owner is in jail, rent is 0
  const owner = players.find(p => p.id === tile.ownerId);
  if (owner && owner.inJail) return 0;

  let consumption = tile.currentPrice * 2; 
  consumption = consumption * (1 + tile.buildingLevel * 0.5);

  if (tile.groupColor && tile.ownerId !== undefined && tile.ownerId !== null) {
    const groupTiles = tiles.filter(t => t.groupColor === tile.groupColor && t.type === TileType.PROPERTY);
    const ownedCount = groupTiles.filter(t => t.ownerId === tile.ownerId).length;
    
    if (ownedCount >= 2) {
      consumption *= ownedCount;
    }
  }

  if (tile.hasTempMultiplier) {
    consumption *= 2;
  }

  if (tile.buildingLevel === 4) {
    consumption *= 2; 
  }

  return Math.floor(consumption);
};

export const calculateBuyoutCost = (tile: Tile): number => {
  // Buyout = 1.5x Market Value (Standard)
  const equityValue = (tile.upgradeCost || 0) * tile.buildingLevel;
  const marketVal = tile.currentPrice + equityValue;
  return Math.floor(marketVal * 1.5);
};

export const calculateTotalAssets = (player: Player, tiles: Tile[]): number => {
  let assets = player.money;
  tiles.forEach(t => {
    if (t.ownerId === player.id && t.type === TileType.PROPERTY) {
      assets += t.currentPrice + ((t.upgradeCost || 0) * t.buildingLevel);
    }
  });
  return assets;
};

export const getNextPosition = (current: number, steps: number): number => {
  return (current + steps) % TILES_DATA.length;
};

export const makeAIDecision = (
  player: Player,
  tile: Tile,
  tiles: Tile[]
): { action: 'BUY' | 'UPGRADE' | 'ACQUIRE' | 'PASS' | 'PAY_BAIL' | 'TELEPORT', buildLevel?: number, targetId?: number } => {
  
  // Teleport Decision (Island Tour)
  if (tile.type === TileType.PARKING) {
      // AI Strat: Go to most expensive unowned property or own property to upgrade
      const unowned = tiles.filter(t => t.type === TileType.PROPERTY && t.ownerId === null)
                           .sort((a,b) => b.currentPrice - a.currentPrice);
      
      if (unowned.length > 0 && player.money > unowned[0].basePrice) {
          return { action: 'TELEPORT', targetId: unowned[0].id };
      }
      
      // Or own property to upgrade
      const own = tiles.filter(t => t.type === TileType.PROPERTY && t.ownerId === player.id && t.buildingLevel < 4)
                       .sort((a,b) => b.currentPrice - a.currentPrice);
      
      if (own.length > 0) return { action: 'TELEPORT', targetId: own[0].id };
      
      return { action: 'TELEPORT', targetId: 0 }; // Fallback to start for salary
  }

  if (player.inJail) {
    return player.money > 500000 ? { action: 'PAY_BAIL' } : { action: 'PASS' }; 
  }

  if (tile.type === TileType.PROPERTY) {
    const price = tile.currentPrice;
    const upgradeCost = tile.upgradeCost || 0;

    // BUY NEW
    if (tile.ownerId === null || tile.ownerId === undefined) {
       const costL2 = price + (upgradeCost * 2);
       if (player.money > costL2) return { action: 'BUY', buildLevel: 2 };
       
       const costL0 = price;
       if (player.money > costL0) return { action: 'BUY', buildLevel: 0 };
    } 
    // UPGRADE OWN
    else if (tile.ownerId === player.id) {
      if (tile.buildingLevel < 4 && player.money > upgradeCost) {
        return { action: 'UPGRADE' };
      }
    }
    // ACQUIRE OTHERS
    else if (tile.ownerId !== player.id) {
       // Check for Free Acquire Card
       if (player.hasFreeAcquireCard) return { action: 'ACQUIRE' };

       // Allow acquisition even if level 4 (per updated prompt: can execute delisting if enough money? 
       // Actually, usually Level 4 is max, but prompt says "Acquire... if maxed, can also delist". 
       // Let's keep standard acquire logic but allow checking buyout cost.
       if (tile.buildingLevel < 4) {
           const buyoutCost = calculateBuyoutCost(tile);
           if (player.money > buyoutCost * 1.2) { // AI buffer
             return { action: 'ACQUIRE' };
           }
       }
    }
  }

  return { action: 'PASS' };
};

export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// New Liquidation Logic
// Return: { success: boolean, recoveredMoney: number, soldTiles: string[] }
export const simulateLiquidation = (player: Player, debt: number, tiles: Tile[]): { success: boolean, newMoney: number, soldTiles: string[] } => {
    // 1. Sort owned properties by Current Price ASC (Low to High)
    const ownedProps = tiles.filter(t => t.ownerId === player.id && t.type === TileType.PROPERTY)
                            .sort((a, b) => a.currentPrice - b.currentPrice);
    
    let cash = player.money;
    const soldNames: string[] = [];

    // 2. Sell one by one at 90% market value (Limit down -10%)
    for (const prop of ownedProps) {
        if (cash >= debt) break; // Solvency reached

        const liquidationValue = Math.floor(prop.currentPrice * 0.9);
        cash += liquidationValue;
        
        // Modify the tile object directly in memory for the result? 
        // Ideally we return the IDs to change, but here we simulate.
        // In App.tsx we will actually commit these changes.
        prop.ownerId = null; // Simulate sell
        prop.buildingLevel = 0;
        soldNames.push(prop.name);
    }

    return {
        success: cash >= debt,
        newMoney: cash,
        soldTiles: soldNames
    };
};
