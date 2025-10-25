export const EXCHANGE_CONFIGS = {
  bybit: {
    name: "Bybit (X03)",
    type: "Unified",
    api_key: "4Gba1MjGbrTTfDAauP",
    api_secret: "QYtOgsHZThh3koyBUDK0DCMUjq3ihmD7YBB2",
    docs: "https://bybit-exchange.github.io/docs/v5/intro",
    status: "active",
  },
  bingx: {
    name: "BingX (X01)",
    type: "Futures",
    api_key: "5MdpxA3eWbqSH3JZ5w6cdCK3Sd19Z2mPiNpmfAPfa5kmPB5bquHn8D8qDXzx2HhnyRLmrCQgpphI8DbLLZQw",
    api_secret: "5uRfPgalVBD9DFAD5McQfbpAWmtiYGiinwiWSMX4Bii9SNPigJXsM1KnLCXT1reH5Wzcvj6RQmIvJrCUgaIhuw",
    docs: "https://bingx-api.github.io/docs/#/en-us/swapV2/introduce",
    status: "active",
  },
  pionex: {
    name: "Pionex (X01)",
    type: "Futures",
    api_key: "5qYgjSMoB4yZHbyEmvUZXNS9CbxePn8JZPGVPX583dSavuradn5Ph2RBCKhMrZ2A36",
    api_secret: "BpIL7YjAyXkWIoLWgCw3PMmCCr1uJsIttSA8VMhBMBFcLX3mziuQUM1KQ31S1BYW",
    docs: "https://pionex-doc.gitbook.io/apidocs/",
    status: "active",
  },
  orangex: {
    name: "OrangeX (X01)",
    type: "Futures",
    api_key: "c0c89d0f",
    api_secret: "b89147149b54e11e36e1514b",
    docs: "https://openapi-docs.orangex.com/",
    status: "active",
  },
  binance: {
    name: "Binance",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://binance-docs.github.io/apidocs/",
    status: "active",
  },
  okx: {
    name: "OKX",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://www.okx.com/docs-v5/en/",
    status: "active",
  },
  gateio: {
    name: "Gate.io",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://www.gate.io/docs/developers/apiv4/",
    status: "active",
  },
  mexc: {
    name: "MEXC",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://mexcdevelop.github.io/apidocs/",
    status: "active",
  },
  bitget: {
    name: "Bitget",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://bitgetlimited.github.io/apidoc/en/mix/",
    status: "failing",
  },
  kucoin: {
    name: "KuCoin",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://docs.kucoin.com/",
    status: "failing",
  },
  huobi: {
    name: "Huobi",
    type: "Spot/Futures",
    api_key: "",
    api_secret: "",
    docs: "https://huobiapi.github.io/docs/spot/v1/en/",
    status: "failing",
  },
}

export const DEFAULT_SYMBOLS = ["BCHUSDT", "XRPUSDT", "ETHUSDT", "LINKUSDT", "DOGEUSDT", "HUSDT"]

export const FORCED_SYMBOLS = ["XRPUSDT", "BCHUSDT"]

export const INDICATION_RANGES = {
  min: 3,
  max: 30,
  step: 1,
}

export const STRATEGY_RANGES = {
  takeprofit: { min: 2, max: 22, step: 1 },
  stoploss: { min: 0.2, max: 2.2, step: 0.1 },
  trail_start: [0.3, 0.6, 1.0],
  trail_stop: [0.1, 0.2, 0.3],
  trail_step: 0.3,
}

export const PROJECT_NAME = "cts"
export const TRADE_SERVICE_NAME = `${PROJECT_NAME}-trade` // "cts-trade"

export const INTERVALS = {
  indication: 1000, // 1 second
  strategy: 1000, // 1 second
  real_position: 300, // 0.3 seconds
}
