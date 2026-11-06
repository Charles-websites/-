
import React, { useState, useEffect } from 'react';
import { Tile, Player, TileType, GamePhase, MarketCycle } from '../types';
import { getEquityPercentage } from '../services/gameService';
import { CYCLE_CONFIG } from '../constants';

interface BoardProps {
  players: Player[];
  tiles: Tile[];
  diceValue: [number, number];
  phase: GamePhase;
  currentPlayer: Player;
  marketCycle: MarketCycle;
  wormholePos: number;
  bananaPos: number;
  onRollStart: () => void;
  onRollStop: (value: number) => void;
  onTileClick: (tile: Tile) => void;
}

const Board: React.FC<BoardProps> = ({ 
  players, 
  tiles, 
  diceValue, 
  phase, 
  currentPlayer,
  marketCycle,
  wormholePos,
  bananaPos,
  onRollStart,
  onRollStop,
  onTileClick
}) => {
  
  const [gaugeValue, setGaugeValue] = useState(0);
  const [gaugeDirection, setGaugeDirection] = useState(1);

  useEffect(() => {
    let animationId: number;
    if (phase === GamePhase.DICE_CONTROL && !currentPlayer.isAI) {
      const animate = () => {
        setGaugeValue(prev => {
          let next = prev + (1.5 * gaugeDirection);
          if (next >= 100) {
            next = 100;
            setGaugeDirection(-1);
          } else if (next <= 0) {
            next = 0;
            setGaugeDirection(1);
          }
          return next;
        });
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationId);
  }, [phase, currentPlayer.isAI, gaugeDirection]);

  const renderTile = (tile: Tile, index: number) => {
    const playersOnTile = players.filter(p => p.position === index && !p.isBankrupt);
    const owner = tile.ownerId !== undefined && tile.ownerId !== null 
      ? players.find(p => p.id === tile.ownerId) 
      : null;

    const isCorner = index % 8 === 0;
    let bgClass = 'bg-slate-100';
    if (tile.type === TileType.GO) bgClass = 'bg-emerald-100';
    if (tile.type === TileType.JAIL || tile.type === TileType.TO_JAIL) bgClass = 'bg-gray-300';
    if (tile.type === TileType.CHANCE) bgClass = 'bg-orange-50';
    if (tile.type === TileType.DESTINY) bgClass = 'bg-blue-50';
    if (tile.buildingLevel === 4) bgClass = 'bg-gradient-to-br from-amber-100 to-amber-300';

    const isActive = players.some(p => p.position === index && p.id === currentPlayer.id);
    const activeGlow = isActive ? 'ring-4 ring-amber-400 z-20 scale-105 shadow-xl' : '';
    const multiplierGlow = tile.hasTempMultiplier ? 'ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : '';
    
    // Selection Mode Glow
    const selectModeGlow = phase === GamePhase.TELEPORT_SELECT ? 'hover:ring-4 hover:ring-cyan-400 animate-pulse' : '';

    const lastPrice = tile.priceHistory?.[tile.priceHistory.length - 2] || tile.basePrice;
    const priceColor = tile.currentPrice > lastPrice ? 'text-red-600' : (tile.currentPrice < lastPrice ? 'text-green-600' : 'text-slate-600');
    const arrow = tile.currentPrice > lastPrice ? '▲' : (tile.currentPrice < lastPrice ? '▼' : '-');

    return (
      <div 
        key={tile.id} 
        onClick={() => onTileClick(tile)}
        className={`
          relative border-[1px] border-slate-800/30 flex flex-col justify-between 
          select-none h-full w-full transition-all duration-300 cursor-pointer hover:brightness-95
          ${bgClass} ${activeGlow} ${multiplierGlow} ${selectModeGlow} ${isCorner ? 'rounded-sm' : ''}
        `}
      >
        {/* OBSTACLES */}
        {index === wormholePos && (
           <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
               <div className="text-4xl animate-spin grayscale-0 filter drop-shadow-lg">🌀</div>
           </div>
        )}
        {index === bananaPos && (
           <div className="absolute bottom-8 right-2 z-10 pointer-events-none">
               <div className="text-2xl animate-bounce">🍌</div>
           </div>
        )}

        {tile.type === TileType.PROPERTY && (
          <div className={`h-4 w-full ${tile.groupColor} border-b border-slate-900/10 flex items-center justify-center relative`}>
             {tile.buildingLevel > 0 && tile.buildingLevel < 4 && owner && (
              <div className="flex space-x-0.5">
                 {Array.from({length: tile.buildingLevel}).map((_, i) => (
                   <div key={i} className={`w-2 h-2 border border-white/50 shadow-sm rounded-sm ${owner.color}`}></div>
                 ))}
              </div>
            )}
            {tile.buildingLevel === 4 && (
               <span className="text-[9px] absolute text-white font-black drop-shadow-md">私有化</span>
            )}
            <span className="absolute right-0.5 top-0 text-[8px] text-white/80 font-mono">{tile.code}</span>
          </div>
        )}
        
        <div className={`text-center px-1 leading-tight text-slate-800 font-bold ${isCorner ? 'text-sm pt-2' : 'text-[10px] pt-1'}`}>
          {tile.name}
        </div>

        <div className="text-center pb-1 flex flex-col items-center">
          {tile.type === TileType.PROPERTY ? (
            tile.buildingLevel === 4 ? (
                <div className="text-xl">🏢</div>
            ) : (
                <div className={`text-[9px] font-mono font-bold ${priceColor}`}>
                    {arrow} ${(tile.currentPrice/1000).toFixed(1)}k
                </div>
            )
          ) : (
             <div className="text-lg opacity-50">
               {tile.type === TileType.CHANCE && '❓'}
               {tile.type === TileType.DESTINY && '⚡'}
               {tile.type === TileType.GO && '🏁'}
               {tile.type === TileType.JAIL && '🔒'}
               {tile.type === TileType.PARKING && '✈️'}
               {tile.type === TileType.TO_JAIL && '👮'}
               {tile.type === TileType.TAX && '💸'}
             </div>
          )}
        </div>
        
        {tile.hasTempMultiplier && (
            <div className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-black px-1 rounded animate-pulse shadow-sm z-10">
                x2
            </div>
        )}

        {owner && (
          <div className={`absolute top-5 right-0 left-0 h-1 ${owner.color} opacity-60`}></div>
        )}

        {owner && tile.type === TileType.PROPERTY && (
           <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] px-0.5 rounded backdrop-blur-sm">
             {Math.round(getEquityPercentage(tile.buildingLevel) * 100)}%
           </div>
        )}

        <div className="absolute bottom-0.5 left-0 right-0 flex justify-center -space-x-1 px-1 pointer-events-none">
          {playersOnTile.map(p => (
            <div 
              key={p.id} 
              className={`
                w-5 h-5 rounded-full border-2 border-white shadow-lg 
                flex items-center justify-center text-[8px] text-white font-black 
                ${p.color} transform transition-transform z-10
                ${p.id === currentPlayer.id ? 'scale-110 ring-2 ring-white' : ''}
              `}
              title={p.name}
            >
              {p.avatar}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getGridStyle = (index: number) => {
    if (index >= 0 && index <= 8) return { gridRow: 9, gridColumn: 9 - index };
    else if (index >= 9 && index <= 15) return { gridRow: 9 - (index - 8), gridColumn: 1 };
    else if (index >= 16 && index <= 24) return { gridRow: 1, gridColumn: index - 15 };
    else return { gridRow: index - 23, gridColumn: 9 };
  };

  const cycleInfo = CYCLE_CONFIG[marketCycle];

  return (
    <div className="relative w-full max-w-[750px] aspect-square p-3 bg-[#2a2b3d] rounded-xl shadow-2xl border-4 border-[#1e1f2e]">
      <div className="grid grid-cols-9 grid-rows-9 w-full h-full bg-[#cbd5e1] border border-slate-800 shadow-inner">
        
        {/* Center Area */}
        <div className="col-start-2 col-end-9 row-start-2 row-end-9 bg-[#1e293b] relative flex flex-col items-center justify-center p-4 overflow-hidden shadow-inner border border-slate-600">
           
           {/* MARKET CYCLE CLOCK */}
           <div className="absolute top-4 w-full flex flex-col items-center">
              <div className="text-xs text-slate-400 tracking-widest mb-1">MARKET CYCLE</div>
              <div className={`text-2xl font-black ${cycleInfo.color} animate-pulse`}>
                 {cycleInfo.label}
              </div>
              <div className="w-48 h-2 bg-slate-700 rounded-full mt-2 overflow-hidden relative">
                  {/* Gauge Bars */}
                  <div className="absolute left-0 w-1/4 h-full bg-blue-800" title="蕭條"></div>
                  <div className="absolute left-1/4 w-1/4 h-full bg-cyan-600" title="衰退"></div>
                  <div className="absolute left-2/4 w-1/4 h-full bg-orange-500" title="復甦"></div>
                  <div className="absolute left-3/4 w-1/4 h-full bg-red-500" title="擴張"></div>
                  
                  {/* Pointer */}
                  <div 
                    className="absolute w-1 h-4 bg-white -top-1 shadow-lg transition-all duration-1000"
                    style={{ 
                        left: marketCycle === MarketCycle.DEPRESSION ? '12.5%' : 
                              marketCycle === MarketCycle.RECESSION ? '37.5%' :
                              marketCycle === MarketCycle.RECOVERY ? '62.5%' : '87.5%'
                    }}
                  ></div>
              </div>
           </div>

           {/* Center Controls */}
           <div className="z-10 flex flex-col items-center justify-center gap-4 mt-12 w-full max-w-sm">
              
              <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm relative">
                <div className={`
                   w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg border-b-4 border-indigo-900 
                   flex items-center justify-center text-4xl font-bold text-white
                   ${phase === GamePhase.MOVING ? 'animate-roll' : ''}
                `}>
                  {diceValue[0]}
                </div>
                <div className={`
                   w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg border-b-4 border-indigo-900 
                   flex items-center justify-center text-4xl font-bold text-white
                   ${phase === GamePhase.MOVING ? 'animate-roll' : ''}
                `}>
                  {diceValue[1]}
                </div>
                {diceValue[0] === diceValue[1] && phase !== GamePhase.ROLL && phase !== GamePhase.DICE_CONTROL && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-red-900 text-xs font-black px-2 py-1 rounded-full animate-bounce border-2 border-white shadow-md">
                        DOUBLE!
                    </div>
                )}
              </div>

              {/* DICE CONTROL */}
              {phase === GamePhase.DICE_CONTROL && !currentPlayer.isAI && (
                  <div className="w-full bg-slate-800 h-8 rounded-full border-2 border-slate-600 relative overflow-hidden shadow-inner cursor-pointer" onClick={() => onRollStop(gaugeValue)}>
                      <div className="absolute left-0 w-[33%] h-full bg-blue-500/50 flex items-center justify-center text-[8px] text-white/50 font-bold border-r border-white/10">SMALL</div>
                      <div className="absolute left-[33%] w-[33%] h-full bg-green-500/50 flex items-center justify-center text-[8px] text-white/50 font-bold border-r border-white/10">MID</div>
                      <div className="absolute right-0 w-[34%] h-full bg-red-500/50 flex items-center justify-center text-[8px] text-white/50 font-bold">BIG</div>
                      <div 
                        className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_white] z-10 transition-none"
                        style={{ left: `${gaugeValue}%` }}
                      ></div>
                  </div>
              )}

               {/* PHASE MESSAGE */}
               {phase === GamePhase.TELEPORT_SELECT && (
                  <div className="bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse font-bold text-sm text-center">
                     環島旅行中...<br/>請點擊地圖選擇目的地
                  </div>
               )}

              <div className="text-center">
                 <div className={`text-xl font-black ${currentPlayer.color} text-white px-6 py-1 rounded-full shadow-lg border border-white/20 inline-block`}>
                   {currentPlayer.name}
                 </div>
              </div>

              <div className="h-14 flex items-center">
                {!currentPlayer.isAI && phase === GamePhase.ROLL && (
                  <button 
                    onClick={onRollStart}
                    className="px-8 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 font-black text-lg rounded-full shadow-lg shadow-amber-500/30 transform transition hover:scale-110 active:scale-95 border border-amber-300"
                  >
                    擲骰子 ROLL
                  </button>
                )}
                 {!currentPlayer.isAI && phase === GamePhase.DICE_CONTROL && (
                  <button 
                    onClick={() => onRollStop(gaugeValue)}
                    className="px-8 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white font-black text-lg rounded-full shadow-lg shadow-red-500/30 transform transition hover:scale-110 active:scale-95 border border-red-300 animate-pulse"
                  >
                    停止 STOP!
                  </button>
                )}
                {currentPlayer.isAI && (
                  <div className="flex items-center gap-2 text-indigo-200/80 font-mono text-sm bg-black/20 px-4 py-2 rounded-full">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></span>
                    AI Thinking...
                  </div>
                )}
              </div>

           </div>
        </div>

        {tiles.map((tile, index) => (
          <div key={tile.id} style={getGridStyle(index)} className="w-full h-full relative">
            {renderTile(tile, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;
