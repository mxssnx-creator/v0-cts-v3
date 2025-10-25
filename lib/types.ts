export interface ExchangeConnection {
  id: string
  name: string
  exchange: string
  api_type: string
  connection_method: string
  api_key: string
  api_secret: string
  margin_type?: string
  position_mode?: string
  is_testnet?: boolean
  volume_factor?: number
  last_test_status?: string
  last_test_balance?: number
  is_enabled: boolean
  is_live_trade: boolean
  created_at: string
  connection_library?: string
  last_test_log?: string[] // Detailed test logs
  last_test_timestamp?: string
  api_capabilities?: string[]
  rate_limits?: {
    requests_per_second: number
    requests_per_minute: number
  }
  is_predefined?: boolean
  connection_priority?: string[]
  use_main_symbols?: boolean
  arrangement_type?: "market_cap" | "market_volume" | "market_volatility" | "price_change" | "liquidity"
  arrangement_count?: number
  is_active?: boolean // Track which connections are active (can be defined in different parts of the project)
  preset_type_id?: string // Assigned preset type for this connection
}

export interface PseudoPosition {
  id: string
  connection_id: string
  symbol: string
  indication_type: "direction" | "move" | "active"
  takeprofit_factor: number
  stoploss_ratio: number
  trailing_enabled: boolean
  trail_start?: number
  trail_stop?: number
  entry_price: number
  current_price: number
  profit_factor: number
  position_cost: number
  status: "active" | "closed"
  created_at: string
  updated_at: string
}

export interface RealPosition {
  id: string
  connection_id: string
  exchange_position_id?: string
  symbol: string
  strategy_type: string
  volume: number
  entry_price: number
  current_price: number
  takeprofit?: number
  stoploss?: number
  profit_loss: number
  status: "open" | "closed"
  opened_at: string
  closed_at?: string
}

export interface TradingPosition extends RealPosition {
  unrealized_pnl: number
  realized_pnl: number
  margin_used: number
  liquidation_price?: number
  fees_paid: number
  hold_time: number // in minutes
  max_profit: number
  max_loss: number
  position_side?: "long" | "short"
  contract_type?: "usdt-perpetual" | "coin-perpetual" | "spot"
  leverage?: number
  volume_factor?: number
  base_volume?: number // Base volume before factor adjustment
  adjusted_volume?: number // Volume after applying volume_factor
  indication_type?: "direction" | "move" | "active"
}

export interface IndicationConfig {
  type: "direction" | "move" | "active"
  range: number // 3-30
  drawdown_ratio?: number // 0.2, 0.3, 0.4
  price_change_ratio?: number // 0.1-1.0 for direction, 0.5-2.5 for active
}

export interface StrategyConfig {
  takeprofit_factor: number // 2-22
  stoploss_ratio: number // 0.2-2.2
  trailing_enabled: boolean
  trail_start?: number // 0.3, 0.6, 1.0
  trail_stop?: number // 0.1, 0.2, 0.3
  last_positions_count: number // 3,4,5,6,8,12,25
  partial_positions_count: number // 1,2,3,4,5
  volume_factor: number // 1-5
  adjustments?: {
    block?: {
      enabled: boolean
      blockSize: number // 2, 4, 6, 8
      adjustmentRatio: number // Volume increase ratio
    }
    dca?: {
      enabled: boolean
      levels: number // 3, 5, 7
    }
  }
}

export type MainStrategyType = "base" | "partial" | "count"

export type AdjustmentType = "block" | "dca"

export interface SystemSettings {
  baseVolumeFactor: number
  minimalProfitFactor: number
  positionCost: number
  symbolsExchangeCount: number
  positionsAverage: number
  timeIntervalIndication: number
  timeIntervalStrategy: number
  timeIntervalReal: number
  realPositionsInterval?: number
  timeRangeHistoryDays?: number // Added time range history data setting
  databaseSizePseudo: number
  percentRearrange: number
  mainSymbols: string[]
  forcedSymbols: string[]

  defaultSymbols: string[]
  symbolSelectionMode: "main" | "forced" | "default" | "exchange"

  maxPositionsPerConfig: number
  maxTotalPositions: number

  maxPositionSize: number
  maxDailyLoss: number
  maxDrawdownPercent: number
  maxOpenPositions: number

  indicationRangeMin: number
  indicationRangeMax: number
  indicationRangeStep: number

  strategyTpMin: number
  strategyTpMax: number
  strategyTpStep: number
  strategySlMin: number
  strategySlMax: number
  strategySlStep: number
  strategyTrailStart: number[]
  strategyTrailStop: number[]
  strategyTrailStep: number

  minProfitFactorBase?: number
  minProfitFactorMain?: number
  minProfitFactorReal?: number
  maxDrawdownTimeMain?: number
  trailingEnabled?: boolean
  adjustTypeBlock?: boolean
  adjustTypeDca?: boolean

  baseValueRangeMin?: number
  baseValueRangeMax?: number
  baseRatioMin?: number
  baseRatioMax?: number
  baseTrailingEnabled?: boolean

  mainPreviousCount?: number
  mainLastStateCount?: number
  mainOngoingTrailing?: boolean
  mainAdjustBlock?: boolean
  mainBlockSize?: number
  mainBlockRatio?: number
  mainBlockState?: string
  mainAdjustDca?: boolean
  mainDcaLevels?: number
  mainDcaRatio?: number
  mainDcaState?: string

  realPreviousCountFilter?: number
  realLastStateCount?: number
  realOngoingCount?: number
  realIncludeTrailing?: boolean
  realAdjustBlockOnly?: boolean
  realPseudoLogging?: boolean
  realLogRetention?: number
  realMinTrades?: number

  // Monitoring Settings
  enableMonitoring?: boolean
  metricsRetentionDays?: number
  cpuAlertThreshold?: number
  memoryAlertThreshold?: number
  queryPerformanceThreshold?: number
  apiResponseThreshold?: number
  positionCountAlert?: number
  dailyPnlAlert?: number
  winRateAlert?: number
  drawdownAlert?: number
  apiHealthChecks?: boolean
  dbHealthChecks?: boolean
  healthCheckInterval?: number
  errorRateThreshold?: number
  monitoringLogLevel?: string
  logFileSizeLimit?: number
  logRetentionDays?: number
  alertFrequencyLimit?: number
  emailAlertsEnabled?: boolean
  telegramAlertsEnabled?: boolean
  browserAlertsEnabled?: boolean
  soundAlertsEnabled?: boolean

  marketDataTimeframe?: number // seconds, default 1

  commonIndicators?: string[] // ["rsi", "macd", "bollinger", "sar", "adx"]

  tradeMode?: "preset" | "main" // preset = common indicators, main = step-based

  indicationValidationTimeout?: number // seconds, default 15
  positionCooldownTimeout?: number // seconds, default 20
  maxPositionsPerConfigSet?: number // default 1

  presetTpMin?: number // Take profit minimum factor (default: 2)
  presetTpMax?: number // Take profit maximum factor (default: 30)
  presetTpStep?: number // Take profit step (default: 2)
  presetSlMin?: number // Stop loss minimum ratio (default: 0.3)
  presetSlMax?: number // Stop loss maximum ratio (default: 3.0)
  presetSlStep?: number // Stop loss step (default: 0.3)
  presetTrailStarts?: number[] // Trailing start values (default: [0.5, 1.0, 1.5])
  presetTrailStops?: number[] // Trailing stop values (default: [0.2, 0.4, 0.6])

  minimumConnectInterval?: number // milliseconds, default 200ms

  indicationPositionStepRatioMin: number // Minimum ratio (default: 0.2)
  indicationPositionStepRatioMax: number // Maximum ratio (default: 1.0)
  // If indication step is 10, position step range is: 10 * 0.2 = 2 (min) to 10 * 1.0 = 10 (max)
}

export interface MarketData {
  id: number
  connection_id: string
  symbol: string
  price: number
  timestamp: string
}

export interface Preset {
  id: string
  name: string
  description?: string
  preset_type: "automatic" | "configured" // Added preset type
  use_automatic_mode: boolean // Enable automatic configuration generation
  indication_types: string[]
  indication_ranges: number[]
  takeprofit_steps: number[]
  stoploss_ratios: number[]
  trailing_enabled: boolean
  trail_starts: number[]
  trail_stops: number[]
  strategy_types: string[]
  last_positions_counts: number[]
  partial_positions_counts: number[]
  block_adjustment_enabled: boolean
  block_sizes: number[]
  block_adjustment_ratios: number[]
  dca_adjustment_enabled: boolean
  dca_levels: number[]
  volume_factors: number[]
  volume_factor_live: number // Separate volume factor for live trade
  volume_factor_preset: number // Separate volume factor for preset trade
  min_profit_factor: number
  min_win_rate: number
  max_drawdown: number
  max_drawdown_hours: number // Added drawdown time in hours
  backtest_period_days: number
  backtest_enabled: boolean
  backtest_auto_add: boolean // Automatically add validated configs
  symbol_selection: "all" | "specific" // All symbols or specific
  specific_symbols: string[] // List of specific symbols
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PresetStrategy {
  id: string
  preset_id: string
  connection_id: string
  symbol: string
  indication_type: string
  indication_range: number
  strategy_type: string
  takeprofit_factor: number
  stoploss_ratio: number
  trailing_enabled: boolean
  trail_start?: number
  trail_stop?: number
  block_adjustment_enabled: boolean
  block_size?: number
  block_adjustment_ratio?: number
  dca_adjustment_enabled: boolean
  dca_levels?: number
  volume_factor: number
  profit_factor: number
  win_rate: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  max_drawdown: number
  is_validated: boolean
  last_validated_at?: string
  created_at: string
  updated_at: string
}

export interface TradeBot {
  id: string
  name: string
  description?: string
  connection_id: string
  symbols: string[]
  max_concurrent_positions: number
  position_timeout_hours: number
  status: "running" | "stopped" | "paused" | "error"
  is_active: boolean
  total_trades: number
  winning_trades: number
  losing_trades: number
  total_pnl: number
  current_positions: number
  started_at?: string
  stopped_at?: string
  last_trade_at?: string
  created_at: string
  updated_at: string
}

export interface BotPresetAssignment {
  id: string
  bot_id: string
  preset_id: string
  priority: number
  is_active: boolean
  assigned_at: string
}

export interface BotTrade {
  id: string
  bot_id: string
  preset_id?: string
  strategy_id?: string
  connection_id: string
  symbol: string
  side: "long" | "short"
  entry_price: number
  exit_price?: number
  quantity: number
  volume_factor: number
  indication_type?: string
  takeprofit_factor?: number
  stoploss_ratio?: number
  trailing_enabled: boolean
  profit_loss?: number
  profit_factor?: number
  fees_paid: number
  status: "open" | "closed" | "cancelled"
  close_reason?: string
  opened_at: string
  closed_at?: string
  created_at: string
}

export interface BacktestResult {
  id: string
  preset_id: string
  connection_id: string
  start_date: string
  end_date: string
  symbols: string[]
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_profit: number
  total_loss: number
  net_profit: number
  profit_factor: number
  max_drawdown: number
  max_drawdown_duration_hours: number
  avg_drawdown: number
  avg_win: number
  avg_loss: number
  largest_win: number
  largest_loss: number
  avg_trade_duration_minutes: number
  sharpe_ratio: number
  sortino_ratio: number
  status: "pending" | "running" | "completed" | "failed"
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface PresetConfig {
  indicatorType: string
  params: {
    period?: number
    overbought?: number
    oversold?: number
    fastPeriod?: number
    slowPeriod?: number
    signalPeriod?: number
    stdDev?: number
    acceleration?: number
    maximum?: number
    tpFactor: number
    slRatio: number
    trailingEnabled: boolean
    trailStart?: number
    trailStop?: number
  }
}

export interface PresetTestResult {
  config: PresetConfig
  test_period_hours: number
  profit_factor: number
  win_rate: number
  total_trades: number
  max_drawdown: number
  max_drawdown_duration_hours: number
  avg_trade_duration_minutes: number
  is_validated: boolean
}

export interface PriceAlert {
  id: string
  symbol: string
  condition: "above" | "below"
  price: number
  current_price: number
  is_enabled: boolean
  created_at: string
  triggered_at: string | null
}

export interface PositionAlert {
  id: string
  position_id: string
  symbol: string
  alert_type: "profit_target" | "stop_loss" | "time_limit"
  threshold: number
  current_value: number
  is_enabled: boolean
  created_at: string
  triggered_at: string | null
}

export interface SystemAlert {
  id: string
  alert_type: "connection_lost" | "high_drawdown" | "api_error" | "low_balance"
  exchange: string
  connection_id: string
  severity: "low" | "medium" | "high"
  message: string
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
}

export interface AlertHistory {
  id: string
  alert_type: "price" | "position" | "system"
  symbol: string | null
  message: string
  triggered_at: string
  acknowledged: boolean
}

export interface SymbolPerformance {
  symbol: string
  profit_factor_12: number // Last 12 positions
  profit_factor_25: number // Last 25 positions
  profit_factor_50: number // Last 50 positions
  pnl_4h: number // Last 4 hours
  pnl_12h: number // Last 12 hours
  pnl_24h: number // Last 24 hours
  drawdown_time_120: number // Drawdown time for last 120 positions (hours)
  market_cap_change_24h: number // Market cap change percentage
  validated_configs_count: number
  last_updated: string
}

export interface BacktestConfig {
  preset_id: string
  timerange_days: number // Default 7 days
  min_profit_factor: number // Slider 0.2-7.0, step 0.1, default 0.5
  max_drawdown_hours: number // Slider 1-12, step 1, default 4
  auto_add_validated: boolean // Automatically add to configured types
  symbols: string[] // Symbols to backtest
}

export type {
  PresetType,
  PresetTypeSet,
  PresetConfigurationSet,
  PresetCoordinationResult,
  PresetRealTrade,
  PresetCoordinationStats,
} from "./types-preset-coordination"
