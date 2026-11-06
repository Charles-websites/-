
export enum TileType {
  GO = 'GO',
  PROPERTY = 'PROPERTY',
  CHANCE = 'CHANCE',
  DESTINY = 'DESTINY',
  JAIL = 'JAIL',
  TO_JAIL = 'TO_JAIL',
  PARKING = 'PARKING',
  TAX = 'TAX',
}

export enum CardType {
  MONEY_ADD = 'MONEY_ADD',
  MONEY_SUB = 'MONEY_SUB',
  MOVE_TO = 'MOVE_TO',
  MOVE_STEPS = 'MOVE_STEPS',
  JAIL = 'JAIL',
  STOP_TURN = 'STOP_TURN',
  FREE_RENT = 'FREE_RENT',
  FREE_ACQUIRE = 'FREE_ACQUIRE', // Changed from HOSTILE_TAKEOVER to FREE ACQUIRE per prompt
  CYCLE_CHANGE = 'CYCLE_CHANGE',
  STOCK_BUMP = 'STOCK_BUMP',   // Single stock +%
  STOCK_CRASH = 'STOCK_CRASH', // Single stock -%
}

export interface Card {
  id: number;
  title: string;
  description: string;
  type: CardType;
  value?: number; // Amount or Position Index or Percentage
  targetId?: number;
  cycleType?: MarketCycle;
}

export enum MarketCycle {
  DEPRESSION = 'DEPRESSION', // 蕭條
  RECESSION = 'RECESSION',   // 衰退
  RECOVERY = 'RECOVERY',     // 復甦
  EXPANSION = 'EXPANSION',   // 擴張
}

export interface Tile {
  id: number;
  name: string;
  code: string;
  type: TileType;
  basePrice: number;
  currentPrice: number;
  priceHistory: number[];
  rent?: number[];
  groupColor?: string;
  ownerId?: number | null;
  buildingLevel: number; // 0=10%, 1=30%, 2=50%, 3=70%, 4=100%
  upgradeCost?: number;
  isLandmark?: boolean;
  hasTempMultiplier?: boolean;
}

export interface Player {
  id: number;
  name: string;
  isAI: boolean;
  money: number;
  position: number;
  color: string;
  tokenColor: string;
  inJail: boolean;
  jailTurns: number;
  isBankrupt: boolean;
  skipTurn: boolean;
  avatar: string;
  consecutiveDoubles: number;
  hasFreeRentCard?: boolean;
  hasFreeAcquireCard?: boolean; // New
}

export enum GamePhase {
  ROLL = 'ROLL',
  DICE_CONTROL = 'DICE_CONTROL',
  MOVING = 'MOVING',
  ACTION = 'ACTION',
  END_TURN = 'END_TURN',
  GAME_OVER = 'GAME_OVER',
  FREE_BUILD_SELECT = 'FREE_BUILD_SELECT',
  TELEPORT_SELECT = 'TELEPORT_SELECT', // New phase for Island Tour
}

export enum GameStatus {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: [number, number];
  tiles: Tile[];
  phase: GamePhase;
  logs: string[];
  marketCycle: MarketCycle; // New
  wormholePosition: number; // New: Index of wormhole
  bananaPosition: number;   // New: Index of banana
  modal: {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'INFO' | 'CONFIRM' | 'CARD' | 'STOCK_INFO';
    data?: any;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null;
}
