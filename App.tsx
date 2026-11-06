
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameState, Player, Tile, GamePhase, TileType, CardType, Card, GameStatus, MarketCycle 
} from './types';
import { 
  TILES_DATA, INITIAL_MONEY, GO_SALARY, JAIL_FINE, CHANCE_CARDS, DESTINY_CARDS, TOTAL_TILES 
} from './constants';
import { 
  calculateRevenue, getNextPosition, makeAIDecision, getRandomInt, calculateBuyoutCost,
  updateStockPricesByCycle, getEquityPercentage, calculateTotalAssets, simulateLiquidation
} from './services/gameService';
import Board from './components/Board';

const PLAYER_CONFIGS = [
  { color: 'bg-red-600', token: '#dc2626', label: '紅色' },
  { color: 'bg-blue-600', token: '#2563eb', label: '藍色' },
  { color: 'bg-green-600', token: '#16a34a', label: '綠色' },
  { color: 'bg-yellow-600', token: '#ca8a04', label: '黃色' },
];

export default function App() {
  const [setupPlayers, setSetupPlayers] = useState([
    { id: 1, name: '巴菲特', isAI: false, enabled: true },
    { id: 2, name: 'AI操盤手', isAI: true, enabled: true },
    { id: 3, name: '外資法人', isAI: true, enabled: true },
    { id: 4, name: '散戶韭菜', isAI: true, enabled: true },
  ]);

  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.SETUP,
    players: [],
    currentPlayerIndex: 0,
    diceValue: [1, 1],
    tiles: [],
    phase: GamePhase.ROLL,
    logs: [],
    modal: null,
    marketCycle: MarketCycle.RECOVERY,
    wormholePosition: -1,
    bananaPosition: -1
  });

  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.logs]);

  const addLog = (msg: string) => {
    setGameState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  // --- Initialization ---
  const spawnObstacles = () => {
      const w = getRandomInt(1, TOTAL_TILES - 1);
      let b = getRandomInt(1, TOTAL_TILES - 1);
      while (b === w) b = getRandomInt(1, TOTAL_TILES - 1);
      return { wormhole: w, banana: b };
  };

  const startGame = () => {
    const activeConfigs = setupPlayers.filter(p => p.enabled);
    if (activeConfigs.length < 2) {
      alert("至少需要兩名玩家才能開始遊戲！");
      return;
    }

    const players: Player[] = activeConfigs.map((cfg, idx) => ({
      id: cfg.id,
      name: cfg.name,
      isAI: cfg.isAI,
      money: INITIAL_MONEY,
      position: 0,
      color: PLAYER_CONFIGS[idx].color,
      tokenColor: PLAYER_CONFIGS[idx].token,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      skipTurn: false,
      avatar: cfg.isAI ? '🤖' : '👤',
      consecutiveDoubles: 0,
      hasFreeAcquireCard: false,
      hasFreeRentCard: false
    }));
    
    const obs = spawnObstacles();

    setGameState({
      status: GameStatus.PLAYING,
      players,
      currentPlayerIndex: 0,
      diceValue: [1, 1],
      tiles: JSON.parse(JSON.stringify(TILES_DATA)),
      phase: GamePhase.ROLL,
      logs: ['股市開盤！歡迎來到台灣上市公司大富翁！', '注意：市場週期、蟲洞、香蕉皮已啟用！'],
      modal: null,
      marketCycle: MarketCycle.RECOVERY,
      wormholePosition: obs.wormhole,
      bananaPosition: obs.banana
    });
  };

  const togglePlayerSetup = (index: number, field: 'enabled' | 'isAI') => {
    const newSetup = [...setupPlayers];
    newSetup[index] = { ...newSetup[index], [field]: !newSetup[index][field] };
    setSetupPlayers(newSetup);
  };
  
  const updatePlayerName = (index: number, name: string) => {
    const newSetup = [...setupPlayers];
    newSetup[index].name = name;
    setSetupPlayers(newSetup);
  };

  // --- Core Logic ---
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const handleStartRoll = () => {
    if (gameState.phase !== GamePhase.ROLL) return;
    setGameState(prev => ({ ...prev, phase: GamePhase.DICE_CONTROL }));
  };

  const handleRollDice = useCallback((gaugeVal: number = 50) => {
    const p = gameState.players[gameState.currentPlayerIndex];
    let d1 = 1, d2 = 1;

    // Jail Dice Check
    if (p.inJail) {
         d1 = getRandomInt(1, 6);
         d2 = getRandomInt(1, 6);
         addLog(`${p.name} 在獄中擲骰: ${d1}, ${d2}`);
         
         if (d1 === d2) {
             // Escape
             setGameState(prev => {
                 const players = [...prev.players];
                 players[prev.currentPlayerIndex].inJail = false;
                 players[prev.currentPlayerIndex].jailTurns = 0;
                 return { ...prev, players };
             });
             addLog(`🎉 ${p.name} 擲出雙骰，保釋成功！`);
             setTimeout(() => movePlayer(d1 + d2, true), 1000);
         } else {
             // Stay
             setGameState(prev => {
                 const players = [...prev.players];
                 players[prev.currentPlayerIndex].jailTurns += 1;
                 
                 if (players[prev.currentPlayerIndex].jailTurns >= 3) {
                     players[prev.currentPlayerIndex].money -= JAIL_FINE;
                     players[prev.currentPlayerIndex].inJail = false;
                     players[prev.currentPlayerIndex].jailTurns = 0;
                     addLog(`${p.name} 羈押期滿，支付 ${JAIL_FINE} 出獄。`);
                     return { ...prev, players, phase: GamePhase.END_TURN };
                 }
                 
                 addLog(`${p.name} 仍被羈押 (回合 ${players[prev.currentPlayerIndex].jailTurns}/3)。`);
                 return { ...prev, players, phase: GamePhase.END_TURN };
             });
         }
         return;
    }

    // Normal Dice Control
    const rand = Math.random();
    let target: 'SMALL' | 'MID' | 'BIG' = 'MID';
    if (gaugeVal <= 33) target = 'SMALL';
    else if (gaugeVal >= 67) target = 'BIG';

    if (rand > 0.8) {
       const opts = ['SMALL', 'MID', 'BIG'].filter(t => t !== target);
       target = opts[Math.floor(Math.random() * opts.length)] as any;
    }

    if (target === 'SMALL') { d1 = getRandomInt(1, 2); d2 = getRandomInt(1, 3); }
    else if (target === 'MID') { d1 = getRandomInt(3, 4); d2 = getRandomInt(3, 4); }
    else { d1 = getRandomInt(5, 6); d2 = getRandomInt(4, 6); }

    const total = d1 + d2;
    const isDouble = d1 === d2;

    addLog(`${p.name} (力度 ${Math.round(gaugeVal)}%) 擲出了 ${d1} + ${d2} = ${total} ${isDouble ? '(雙骰!)' : ''}`);

    setGameState(prev => {
        const players = [...prev.players];
        const curP = players[prev.currentPlayerIndex];
        if (isDouble) curP.consecutiveDoubles += 1;
        else curP.consecutiveDoubles = 0;

        return { ...prev, players, diceValue: [d1, d2], phase: GamePhase.MOVING };
    });

    setTimeout(() => movePlayer(total, isDouble), 800);
  }, [gameState.currentPlayerIndex, gameState.status, gameState.phase]);

  const movePlayer = (steps: number, isDouble: boolean) => {
    setGameState(prev => {
      const players = [...prev.players];
      const p = players[prev.currentPlayerIndex];
      
      if (p.consecutiveDoubles >= 3) {
           p.position = 9; 
           p.inJail = true;
           p.jailTurns = 0;
           p.consecutiveDoubles = 0;
           addLog(`🚓 ${p.name} 連續三次雙骰，涉嫌操縱股價被捕！`);
           return { ...prev, players, phase: GamePhase.END_TURN };
      }

      let newPos = p.position + steps;
      if (newPos >= prev.tiles.length) {
        newPos = newPos % prev.tiles.length;
        p.money += GO_SALARY * 2; 
        addLog(`${p.name} 經過起點，獲得薪水 $${(GO_SALARY * 2).toLocaleString()}`);
      }
      p.position = newPos;
      
      return { ...prev, players, phase: GamePhase.ACTION };
    });
  };

  // Main Trigger Effect
  useEffect(() => {
    if (gameState.phase === GamePhase.ACTION && gameState.status === GameStatus.PLAYING) {
      const p = gameState.players[gameState.currentPlayerIndex];
      
      // 1. Check Obstacles
      if (p.position === gameState.wormholePosition) {
          const randPos = getRandomInt(0, TOTAL_TILES - 1);
          addLog(`🌀 ${p.name} 踩到蟲洞！被吸入異次元...`);
          setTimeout(() => {
              setGameState(prev => {
                 const players = [...prev.players];
                 players[prev.currentPlayerIndex].position = randPos;
                 addLog(`✨ ${p.name} 被傳送到 ${prev.tiles[randPos].name}`);
                 return { ...prev, players };
              });
              // Recursive Trigger (Need delay to update state)
              setTimeout(() => {
                  const newTile = gameState.tiles[randPos];
                  handleTileTrigger(p, newTile);
              }, 500);
          }, 1000);
          return;
      }

      if (p.position === gameState.bananaPosition) {
          const nextPos = getNextPosition(p.position, 1);
          addLog(`🍌 ${p.name} 踩到香蕉皮！滑倒到下一格...`);
          setTimeout(() => {
              setGameState(prev => {
                 const players = [...prev.players];
                 players[prev.currentPlayerIndex].position = nextPos;
                 return { ...prev, players };
              });
              // Recursive Trigger
              setTimeout(() => {
                  const newTile = gameState.tiles[nextPos];
                  handleTileTrigger(p, newTile);
              }, 500);
          }, 1000);
          return;
      }

      const tile = gameState.tiles[p.position];
      handleTileTrigger(p, tile);
    }
  }, [gameState.phase, gameState.status, gameState.wormholePosition, gameState.bananaPosition]);

  const handleTileTrigger = (player: Player, tile: Tile) => {
    if (tile.type === TileType.PROPERTY) {
        const upgradeCost = tile.upgradeCost || 0;
        const price = tile.currentPrice || 0;

        // A. BUY IPO
        if (tile.ownerId === undefined || tile.ownerId === null) {
            const costL2 = price + (upgradeCost * 2);
            
            if (player.isAI) {
               const decision = makeAIDecision(player, tile, gameState.tiles);
               if (decision.action === 'BUY') {
                   buyProperty(player.id, tile, decision.buildLevel ?? 0);
               }
               else endTurn();
            } else {
               let promptMsg = `${tile.name} (代號 ${tile.code}) IPO價格 $${price.toLocaleString()}`;
               let confirmFn = () => buyProperty(player.id, tile, 0);
               let confirmTxt = "入股 (10%)";
               
               if (player.money >= costL2) {
                   promptMsg += `\n\n🔥 增資方案:\n入股 + 增資2次 = $${costL2.toLocaleString()}`;
                   confirmFn = () => buyProperty(player.id, tile, 2);
                   confirmTxt = "強力入股 (50%)";
               }

               setGameState(prev => ({
                 ...prev,
                 modal: {
                   isOpen: true,
                   title: '新股申購',
                   message: promptMsg,
                   type: 'CONFIRM',
                   onConfirm: confirmFn,
                   onCancel: () => endTurn(),
                   confirmText: confirmTxt,
                   cancelText: "放棄"
                 }
               }));
            }
        } 
        // B. OWNED BY SELF -> UPGRADE
        else if (tile.ownerId === player.id) {
            if (tile.buildingLevel < 4) {
                if (player.isAI) {
                    const decision = makeAIDecision(player, tile, gameState.tiles);
                    if (decision.action === 'UPGRADE') upgradeProperty(player.id, tile);
                    else endTurn();
                } else {
                     setGameState(prev => ({
                        ...prev,
                        modal: {
                            isOpen: true,
                            title: '增資擴股',
                            message: `增加 ${tile.name} 持股? 費用: $${tile.upgradeCost?.toLocaleString()}`,
                            type: 'CONFIRM',
                            onConfirm: () => upgradeProperty(player.id, tile),
                            onCancel: () => endTurn(),
                            confirmText: "增資",
                            cancelText: "跳過"
                        }
                     }));
                }
            } else {
                endTurn();
            }
        } 
        // C. OWNED BY OTHERS
        else {
            const revenue = calculateRevenue(tile, gameState.tiles, gameState.players);
            
            // Check Free Rent
            let finalRevenue = revenue;
            if (player.hasFreeRentCard && revenue > 0) {
                player.hasFreeRentCard = false;
                addLog(`🛡️ ${player.name} 使用了免過路費卡，免除消費 $${revenue.toLocaleString()}`);
                finalRevenue = 0;
            }

            if (finalRevenue > 0) {
                payRevenue(player.id, tile.ownerId!, finalRevenue, tile, () => {
                    checkBuyout(player, tile);
                });
            } else {
                checkBuyout(player, tile);
            }
        }
    }
    else if (tile.type === TileType.GO) {
        handleFreeBuild(player);
    }
    else if (tile.type === TileType.PARKING) {
        // Island Tour Teleport
        addLog(`${player.name} 抵達環島旅行社！準備出發...`);
        if (player.isAI) {
            const decision = makeAIDecision(player, tile, gameState.tiles);
            handleTeleport(player, decision.targetId || 0);
        } else {
            setGameState(prev => ({ ...prev, phase: GamePhase.TELEPORT_SELECT }));
        }
    }
    else if (tile.type === TileType.CHANCE || tile.type === TileType.DESTINY) {
        drawCard(tile.type === TileType.CHANCE ? CHANCE_CARDS : DESTINY_CARDS);
    }
    else if (tile.type === TileType.TAX) {
        deductMoney(player.id, tile.rent![0]);
    }
    else if (tile.type === TileType.TO_JAIL) {
        goToJail(player.id);
    }
    else {
        endTurn();
    }
  };

  // --- Teleport Logic ---
  const handleTileClick = (tile: Tile) => {
      if (gameState.phase === GamePhase.TELEPORT_SELECT) {
          handleTeleport(gameState.players[gameState.currentPlayerIndex], tile.id);
          return;
      }
      if (gameState.phase === GamePhase.FREE_BUILD_SELECT) {
           if (tile.ownerId === gameState.players[gameState.currentPlayerIndex].id && tile.buildingLevel < 4) {
              upgradeProperty(tile.ownerId, tile, true);
          } else {
              alert("只能選擇自己的非私有化資產！");
          }
          return;
      }
      // Info Modal
      const owner = tile.ownerId ? gameState.players.find(p => p.id === tile.ownerId) : null;
      const equity = getEquityPercentage(tile.buildingLevel);
      const revenue = calculateRevenue(tile, gameState.tiles, gameState.players);
      setGameState(prev => ({
          ...prev,
          modal: {
              isOpen: true,
              title: `${tile.name} (${tile.code})`,
              message: `股價: $${tile.currentPrice.toLocaleString()}\n` +
                       (owner ? `大股東: ${owner.name} (${Math.round(equity*100)}%)\n消費: $${revenue.toLocaleString()}` : '尚未上市') + 
                       `\n\n增資成本: $${tile.upgradeCost?.toLocaleString() || 0}`,
              type: 'INFO',
              onConfirm: () => setGameState(curr => ({...curr, modal: null}))
          }
      }));
  };

  const handleTeleport = (player: Player, targetId: number) => {
      setGameState(prev => {
          const players = [...prev.players];
          const p = players[prev.currentPlayerIndex];
          
          // Check if passing GO
          let steps = targetId - p.position;
          if (steps < 0) steps += TOTAL_TILES;
          
          // If we wrap around (target < current), trigger Salary
          // Or strictly calculate intermediate steps? 
          // Simplest: if targetId < position, we passed Go.
          if (targetId < p.position) {
               p.money += GO_SALARY * 2;
               addLog(`${p.name} 環島途中經過起點，領取薪水！`);
          }
          
          p.position = targetId;
          addLog(`✈️ ${p.name} 飛往 ${prev.tiles[targetId].name}`);
          
          return { ...prev, players, phase: GamePhase.ACTION };
      });
      
      // Trigger tile effect after state update
      setTimeout(() => {
           handleTileTrigger(player, gameState.tiles[targetId]);
      }, 500);
  };

  // --- Buyout Logic ---
  const checkBuyout = (player: Player, tile: Tile) => {
      setGameState(current => {
          const p = current.players.find(pl => pl.id === player.id);
          const t = current.tiles.find(tl => tl.id === tile.id);
          
          if (!p || p.isBankrupt || !t) return { ...current, phase: GamePhase.END_TURN };

          // 1. Check "Free Acquire" Card
          if (p.hasFreeAcquireCard) {
               return {
                  ...current,
                  modal: {
                      isOpen: true,
                      title: '收購權證行使',
                      message: `您擁有收購權證，可以免費獲得 ${t.name} 的股權！`,
                      type: 'CONFIRM',
                      onConfirm: () => {
                          p.hasFreeAcquireCard = false;
                          acquireProperty(p.id, t, 0); // Cost 0
                      },
                      onCancel: () => endTurn(),
                      confirmText: "免費收購"
                  }
               };
          }

          // 2. Regular Buyout (Can acquire up to Level 4 / Privatize)
          // If it's already Level 4 (Privatized), it usually can't be acquired unless specified.
          // Prompt says "Can acquire... if maxed, can delist".
          // Let's assume Level 4 is acquirable if you have HUGE money (2x value).
          const buyoutCost = calculateBuyoutCost(t);
          
          if (p.isAI) {
              const decision = makeAIDecision(p, t, current.tiles);
              if (decision.action === 'ACQUIRE') {
                  acquireProperty(p.id, t, buyoutCost);
                  return { ...current }; 
              }
              return { ...current, phase: GamePhase.END_TURN };
          } else {
              return {
                  ...current,
                  modal: {
                      isOpen: true,
                      title: '敵意收購 ⚔️',
                      message: `是否以 $${buyoutCost.toLocaleString()} (1.5倍市值) 強制收購 ${t.name}?\n收購後可增資一級或私有化。`,
                      type: 'CONFIRM',
                      onConfirm: () => acquireProperty(p.id, t, buyoutCost),
                      onCancel: () => endTurn(),
                      confirmText: "收購",
                      cancelText: "結束回合"
                  }
              };
          }
      });
  };

  const acquireProperty = (playerId: number, tile: Tile, cost: number) => {
      setGameState(prev => {
          const players = [...prev.players];
          const tiles = [...prev.tiles];
          const buyer = players.find(pl => pl.id === playerId);
          const oldOwner = players.find(pl => pl.id === tile.ownerId);
          const t = tiles[tile.id];

          if (buyer && buyer.money >= cost) {
              buyer.money -= cost;
              if (oldOwner) {
                  oldOwner.money += cost;
              }
              t.ownerId = buyer.id;
              
              // Point 4: Get next level equity
              if (t.buildingLevel < 4) {
                  t.buildingLevel += 1;
              }
              
              addLog(`⚔️ ${buyer.name} ${cost === 0 ? '行使權證免費' : `斥資 $${cost.toLocaleString()}`} 強制收購 ${t.name}！`);
          }
          return { ...prev, players, tiles, modal: null, phase: GamePhase.END_TURN };
      });
  };

  // --- Liquidation & Payment ---
  const payRevenue = (fromId: number, toId: number, amount: number, tile: Tile, onPaid: () => void) => {
    setGameState(prev => {
        const players = [...prev.players];
        const payer = players.find(p => p.id === fromId);
        const owner = players.find(p => p.id === toId);

        if (payer && owner && payer.id !== owner.id) {
            // Check Solvency
            if (payer.money < amount) {
                // Point 5: Liquidation from Low to High Market Value at 90%
                const result = simulateLiquidation(payer, amount, prev.tiles);
                
                if (result.success) {
                    // Commit Liquidation
                    addLog(`⚠️ ${payer.name} 現金不足，砍倉資產: ${result.soldTiles.join(', ')}`);
                    payer.money = result.newMoney;
                    // Clear owners
                    prev.tiles.forEach(t => {
                        if (result.soldTiles.includes(t.name)) {
                            t.ownerId = null;
                            t.buildingLevel = 0;
                        }
                    });
                } else {
                    // Bankrupt
                    payer.isBankrupt = true;
                    payer.money = 0;
                    addLog(`❌ ${payer.name} 砍倉後仍資不抵債，宣告破產！`);
                    // Release all assets
                    prev.tiles.forEach(t => {
                         if (t.ownerId === payer.id) { t.ownerId = null; t.buildingLevel = 0; }
                    });
                    return { ...prev, players, phase: GamePhase.END_TURN };
                }
            }

            // Proceed Payment
            const equityPct = getEquityPercentage(tile.buildingLevel);
            const payout = Math.floor(amount * equityPct);
            
            payer.money -= amount;
            owner.money += payout;
            addLog(`💸 ${payer.name} 支付消費 $${amount.toLocaleString()} (股東分紅 $${payout.toLocaleString()})`);
        }
        return { ...prev, players, phase: GamePhase.ACTION };
    });
    setTimeout(onPaid, 500);
  };

  const deductMoney = (playerId: number, amount: number) => {
     setGameState(prev => {
        const players = [...prev.players];
        const p = players.find(pl => pl.id === playerId);
        if (p) {
             if (p.money < amount) {
                const res = simulateLiquidation(p, amount, prev.tiles);
                if (res.success) {
                    addLog(`⚠️ ${p.name} 砍倉繳稅: ${res.soldTiles.join(', ')}`);
                    p.money = res.newMoney;
                    prev.tiles.forEach(t => { if(res.soldTiles.includes(t.name)) { t.ownerId = null; t.buildingLevel=0; }});
                    p.money -= amount;
                } else {
                    p.isBankrupt = true; 
                    addLog(`❌ ${p.name} 破產！`);
                    prev.tiles.forEach(t => { if (t.ownerId === p.id) { t.ownerId = null; t.buildingLevel = 0; }});
                }
             } else {
                p.money -= amount;
                addLog(`${p.name} 繳費 $${amount.toLocaleString()}`);
             }
        }
        return { ...prev, players, phase: GamePhase.END_TURN };
     });
  };

  // --- Utility Actions ---
  const buyProperty = (playerId: number, tile: Tile, targetLevel: number) => {
    setGameState(prev => {
        const players = [...prev.players];
        const tiles = [...prev.tiles];
        const p = players.find(pl => pl.id === playerId);
        const t = tiles[tile.id];
        const basePrice = t.currentPrice || 0;
        const upgrade = t.upgradeCost || 0;
        const totalCost = basePrice + (upgrade * targetLevel);
        
        if (p && p.money >= totalCost) {
            p.money -= totalCost;
            t.ownerId = playerId;
            t.buildingLevel = targetLevel;
            addLog(`${p.name} 入股 ${t.name} (${Math.round(getEquityPercentage(targetLevel)*100)}%)`);
        }
        return { ...prev, players, tiles, modal: null, phase: GamePhase.END_TURN };
    });
  };

  const upgradeProperty = (playerId: number, tile: Tile, free: boolean = false) => {
    setGameState(prev => {
        const players = [...prev.players];
        const tiles = [...prev.tiles];
        const p = players.find(pl => pl.id === playerId);
        const t = tiles[tile.id];
        if (p && (free || p.money >= tile.upgradeCost!)) {
            if (!free) p.money -= tile.upgradeCost!;
            t.buildingLevel += 1;
            addLog(`${p.name} ${free ? '免費' : ''}增資 ${t.name}`);
        }
        return { ...prev, players, tiles, modal: null, phase: GamePhase.END_TURN };
    });
  };
  
  const handleFreeBuild = (player: Player) => {
      const ownProps = gameState.tiles.filter(t => t.ownerId === player.id && t.buildingLevel < 4);
      if (ownProps.length === 0) {
          addLog("名下無可升級資產。");
          endTurn();
          return;
      }
      if (player.isAI) {
          const target = ownProps.sort((a,b) => b.currentPrice - a.currentPrice)[0];
          upgradeProperty(player.id, target, true);
      } else {
          setGameState(prev => ({
              ...prev,
              phase: GamePhase.FREE_BUILD_SELECT,
              modal: {
                  isOpen: true,
                  title: '免費增資',
                  message: '請點擊地圖上您的任一資產進行免費升級！',
                  type: 'INFO',
                  confirmText: '我知道了',
                  onConfirm: () => setGameState(curr => ({...curr, modal: null}))
              }
          }));
      }
  };

  const goToJail = (playerId: number) => {
      setGameState(prev => {
          const players = [...prev.players];
          const p = players.find(pl => pl.id === playerId);
          if (p) {
              p.position = 9; 
              p.inJail = true;
              p.jailTurns = 0;
              p.consecutiveDoubles = 0;
              addLog(`👮 ${p.name} 涉嫌違約交割，被收押！`);
          }
          return { ...prev, players, phase: GamePhase.END_TURN };
      });
  };

  const drawCard = (deck: Card[]) => {
      const card = deck[getRandomInt(0, deck.length - 1)];
      const handleEffect = () => applyCardEffect(card);

      if (currentPlayer.isAI) {
          setTimeout(handleEffect, 1000);
      } else {
          setGameState(prev => ({
              ...prev,
              modal: {
                  isOpen: true,
                  title: '命運 / 機會',
                  message: `${card.title}\n\n${card.description}`,
                  type: 'CARD',
                  onConfirm: handleEffect,
                  confirmText: "確定"
              }
          }));
      }
  };

  const applyCardEffect = (card: Card) => {
      setGameState(prev => {
          const players = [...prev.players];
          const p = players[prev.currentPlayerIndex];
          let newCycle = prev.marketCycle;
          let tiles = [...prev.tiles];

          addLog(`${p.name} 效果: ${card.title}`);

          switch (card.type) {
              case CardType.MONEY_ADD: p.money += card.value || 0; break;
              case CardType.MONEY_SUB: deductMoney(p.id, card.value || 0); break;
              case CardType.MOVE_STEPS: p.position = getNextPosition(p.position, card.value || 0); break;
              case CardType.MOVE_TO: 
                   if (card.targetId !== undefined) {
                       // Handle direct teleport without triggering landing logic? 
                       // Or treat as Teleport? If it's Island Tour (16), handle specially.
                       if (card.targetId === 16) {
                           // Just move there, then the loop will trigger handleTileTrigger(16) -> Teleport Select
                           p.position = 16;
                       } else {
                           p.position = card.targetId; 
                       }
                   }
                   break;
              case CardType.JAIL: goToJail(p.id); return { ...prev, players, modal: null };
              case CardType.STOP_TURN: p.skipTurn = true; break;
              case CardType.FREE_RENT: p.hasFreeRentCard = true; break;
              case CardType.FREE_ACQUIRE: p.hasFreeAcquireCard = true; break;
              case CardType.CYCLE_CHANGE: 
                   if (card.cycleType) {
                       newCycle = card.cycleType;
                       addLog(`🌍 全球經濟進入 ${newCycle} 週期！`);
                       tiles = updateStockPricesByCycle(tiles, newCycle);
                   }
                   break;
              case CardType.STOCK_BUMP:
              case CardType.STOCK_CRASH:
                   const owned = tiles.filter(t => t.ownerId === p.id && t.type === TileType.PROPERTY);
                   if (owned.length > 0) {
                       const target = owned[getRandomInt(0, owned.length-1)];
                       const mult = card.type === CardType.STOCK_BUMP ? (1 + (card.value||0)) : (1 - (card.value||0));
                       target.currentPrice = Math.floor(target.currentPrice * mult);
                       addLog(`📊 ${target.name} 股價${mult > 1 ? '暴漲' : '崩跌'}至 $${target.currentPrice.toLocaleString()}`);
                   } else {
                       addLog("名下無資產，無受影響。");
                   }
                   break;
          }
          
          // If Move Card, we might want to re-trigger logic, but for now End Turn is safer
          return { ...prev, players, tiles, marketCycle: newCycle, modal: null, phase: GamePhase.END_TURN };
      });
  };

  const endTurn = () => {
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
      
      turnTimeoutRef.current = setTimeout(() => {
          setGameState(prev => {
              const activePlayers = prev.players.filter(p => !p.isBankrupt);
              if (activePlayers.length <= 1) {
                   return {
                       ...prev,
                       modal: {
                           isOpen: true,
                           title: '🏆 遊戲結束',
                           message: `股神誕生： ${activePlayers[0]?.name}!`,
                           type: 'INFO',
                           onConfirm: () => window.location.reload(),
                           confirmText: "再玩一局"
                       },
                       status: GameStatus.FINISHED,
                       phase: GamePhase.GAME_OVER
                   };
              }

              const curP = prev.players[prev.currentPlayerIndex];
              const wasDouble = prev.diceValue[0] === prev.diceValue[1];
              
              if (wasDouble && !curP.isBankrupt && !curP.inJail && curP.consecutiveDoubles < 3) {
                  addLog(`${curP.name} 雙骰，再操作一次！`);
                  return { ...prev, phase: GamePhase.ROLL };
              }

              let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
              while (prev.players[nextIndex].isBankrupt) {
                  nextIndex = (nextIndex + 1) % prev.players.length;
              }
              
              const nextPlayer = prev.players[nextIndex];
              if (nextPlayer.skipTurn) {
                  nextPlayer.skipTurn = false;
                  addLog(`${nextPlayer.name} 暫停一回合。`);
              }

              // Point 10: Cycle Randomization (Every turn a random cycle affects price)
              // Randomly pick a cycle
              const cycles = Object.values(MarketCycle);
              const nextCycle = cycles[getRandomInt(0, cycles.length - 1)];
              const newTiles = updateStockPricesByCycle(prev.tiles, nextCycle);
              
              // Reset Multipliers
              newTiles.forEach(t => t.hasTempMultiplier = false);
              const props = newTiles.filter(t => t.type === TileType.PROPERTY);
              if (props.length > 0) {
                  const shuffled = [...props].sort(() => 0.5 - Math.random());
                  shuffled.slice(0, 4).forEach(t => t.hasTempMultiplier = true);
              }
              
              // Respawn Obstacles
              const obs = spawnObstacles();

              return {
                  ...prev,
                  currentPlayerIndex: nextIndex,
                  tiles: newTiles,
                  marketCycle: nextCycle,
                  wormholePosition: obs.wormhole,
                  bananaPosition: obs.banana,
                  phase: GamePhase.ROLL
              };
          });
      }, 1000);
  };

  // AI Automation
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const activePlayer = gameState.players[gameState.currentPlayerIndex];

    if (gameState.phase === GamePhase.ROLL && activePlayer.skipTurn && !activePlayer.isBankrupt) {
         setTimeout(() => endTurn(), 1000);
         return;
    }

    if (gameState.phase === GamePhase.ROLL && activePlayer.isAI && !activePlayer.isBankrupt) {
        const timer = setTimeout(() => {
            handleStartRoll();
            setTimeout(() => {
                handleRollDice(getRandomInt(0, 100));
            }, 800);
        }, 800);
        return () => clearTimeout(timer);
    }
    else if (gameState.phase === GamePhase.END_TURN) {
        endTurn();
    }
  }, [gameState.phase, gameState.currentPlayerIndex, gameState.status]);


  // --- Render ---
  if (gameState.status === GameStatus.SETUP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
           <h1 className="text-4xl md:text-5xl font-black text-center mb-2 text-indigo-400">台灣股市大富翁</h1>
           <p className="text-center text-slate-400 mb-8 tracking-widest uppercase text-sm">Listed Companies Edition</p>
           
           <div className="space-y-4 mb-8">
             {setupPlayers.map((p, i) => (
               <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${p.enabled ? 'bg-white/10 border-white/20' : 'bg-slate-800/50 border-slate-700 opacity-50'}`}>
                 <button 
                   onClick={() => togglePlayerSetup(i, 'enabled')}
                   className={`w-6 h-6 rounded flex items-center justify-center border ${p.enabled ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}
                 >
                   {p.enabled && '✓'}
                 </button>
                 <div className={`w-8 h-8 rounded-full ${PLAYER_CONFIGS[i].color} shadow`}></div>
                 <input 
                   type="text" 
                   value={p.name}
                   disabled={!p.enabled}
                   onChange={(e) => updatePlayerName(i, e.target.value)}
                   className="bg-transparent border-b border-slate-500 focus:border-indigo-400 outline-none px-2 py-1 flex-1 text-lg font-medium"
                 />
                 <button 
                   onClick={() => togglePlayerSetup(i, 'isAI')}
                   disabled={!p.enabled}
                   className={`px-4 py-1 rounded-full text-xs font-bold tracking-wider transition-colors ${p.isAI ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-900'}`}
                 >
                   {p.isAI ? '電腦 AI' : '真人玩家'}
                 </button>
               </div>
             ))}
           </div>
           <button 
             onClick={startGame}
             className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-xl text-white shadow-lg hover:shadow-indigo-500/20 transform transition hover:scale-[1.02] active:scale-95"
           >
             公司掛牌上市 (START GAME)
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-100 overflow-hidden">
      
      <div className="w-full lg:w-72 bg-[#1a1c2e] border-r border-slate-800 flex flex-col z-10 shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-[#131524]">
          <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
            <span>📊</span> 股東名冊
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {gameState.players.map((p, i) => (
            <div key={p.id} className={`
              relative overflow-hidden p-4 rounded-xl border transition-all duration-300
              ${gameState.currentPlayerIndex === i ? 'border-indigo-500/50 bg-white/5 shadow-[0_0_20px_rgba(99,102,241,0.1)] scale-[1.02]' : 'border-slate-700/50 bg-slate-800/30'} 
              ${p.isBankrupt ? 'opacity-40 grayscale' : ''}
            `}>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center text-lg shadow-lg border-2 border-white/10`}>
                     {p.avatar}
                   </div>
                   <div>
                     <div className="font-bold text-slate-200">{p.name}</div>
                     <div className="flex gap-1">
                        {p.inJail && <span className="text-[10px] bg-red-500/80 text-white px-1.5 py-0.5 rounded">收押中</span>}
                        {p.hasFreeRentCard && <span className="text-[10px] bg-blue-500/80 text-white px-1.5 py-0.5 rounded">免稅</span>}
                        {p.hasFreeAcquireCard && <span className="text-[10px] bg-amber-500/80 text-white px-1.5 py-0.5 rounded">權證</span>}
                     </div>
                   </div>
                </div>
              </div>
              
              <div className="flex justify-between items-end relative z-10">
                 <div className="text-slate-400 text-xs">現金</div>
                 <div className="text-emerald-400 font-mono text-lg font-bold">
                   ${p.money.toLocaleString()}
                 </div>
              </div>
              <div className="flex justify-between items-end relative z-10 mt-1">
                 <div className="text-slate-400 text-xs">總資產</div>
                 <div className="text-indigo-300 font-mono text-sm font-bold">
                   ${calculateTotalAssets(p, gameState.tiles).toLocaleString()}
                 </div>
              </div>
              
              {gameState.currentPlayerIndex === i && !p.isBankrupt && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center p-2 lg:p-8 bg-[#0f172a] overflow-hidden">
        <Board 
          players={gameState.players} 
          tiles={gameState.tiles} 
          diceValue={gameState.diceValue}
          phase={gameState.phase}
          currentPlayer={currentPlayer}
          marketCycle={gameState.marketCycle}
          wormholePos={gameState.wormholePosition}
          bananaPos={gameState.bananaPosition}
          onRollStart={handleStartRoll}
          onRollStop={handleRollDice}
          onTileClick={handleTileClick}
        />
      </div>

      <div className="w-full lg:w-80 bg-[#1a1c2e] border-l border-slate-800 flex flex-col z-10 shadow-xl h-48 lg:h-auto">
         <div className="p-4 border-b border-slate-800 bg-[#131524] font-bold text-slate-300 flex justify-between items-center">
           <span>📰 市場快訊</span>
           <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">News</span>
         </div>
         <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-3 custom-scrollbar" ref={scrollRef}>
            {gameState.logs.map((log, i) => (
              <div key={i} className="border-l-2 border-slate-600 pl-3 py-1 text-slate-300 hover:bg-white/5 transition-colors">
                <span className="text-slate-500 mr-2 select-none">{(i+1).toString().padStart(2, '0')}</span>
                {log}
              </div>
            ))}
         </div>
      </div>

      {gameState.modal && gameState.modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-8 rounded-2xl shadow-2xl transform transition-all scale-100 border-t border-white/20">
            <div className={`text-center mb-6 ${gameState.modal.type === 'CARD' ? 'text-amber-400' : 'text-white'}`}>
              <div className="text-4xl mb-2">
                {gameState.modal.type === 'CARD' ? '🎴' : gameState.modal.type === 'INFO' ? 'ℹ️' : '🔔'}
              </div>
              <h3 className="text-2xl font-bold">{gameState.modal.title}</h3>
            </div>
            
            <div className="text-slate-300 mb-8 text-center leading-relaxed whitespace-pre-wrap text-lg">
              {gameState.modal.message}
            </div>
            
            <div className="flex flex-col gap-3">
               {gameState.modal.type === 'CONFIRM' ? (
                 <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={gameState.modal.onCancel}
                     className="px-4 py-3 rounded-xl text-slate-300 bg-slate-700 hover:bg-slate-600 font-bold transition-colors"
                   >
                     {gameState.modal.cancelText || '取消'}
                   </button>
                   <button 
                     onClick={() => {
                        if(gameState.modal?.onConfirm) gameState.modal.onConfirm();
                        else setGameState(prev => ({ ...prev, modal: null }));
                     }}
                     className="px-4 py-3 rounded-xl text-slate-900 bg-emerald-400 hover:bg-emerald-300 font-bold shadow-lg shadow-emerald-500/20 transition-colors"
                   >
                     {gameState.modal.confirmText || '確認'}
                   </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => {
                      if(gameState.modal?.onConfirm) gameState.modal.onConfirm();
                      else setGameState(prev => ({ ...prev, modal: null }));
                   }}
                   className="w-full px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg transition-colors"
                 >
                   {gameState.modal.confirmText || '確定'}
                 </button>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
