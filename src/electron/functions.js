const _ = require('lodash')

const getDecimals = (value) => {
  const absValue = Math.abs(value)
  if (absValue < 0.0005) return 6
  if (absValue < 0.005) return 5
  if (absValue < 0.05) return 4
  if (absValue < 0.5) return 3
  if (absValue < 1) return 2
  if (absValue < 1000) return 2
  if (absValue < 10000) return 1
  return 0
}

const precision = (value, decimals = getDecimals(value)) => {
  const x = 10 ** decimals
  const a = value * x
  const b = a < 0 ? Math.floor(a) : Math.ceil(a)
  return b / x
}

const getPLPrice = (basePrice, plPercent, sideSign) =>
  basePrice + sideSign * (plPercent / 100) * basePrice

const getPLPerc = (basePrice, price, sideSign) => ((price / basePrice - 1) / sideSign) * 100

const getFullSize = (amount, count) =>
  _.range(0, count).reduce((acc, i) => acc * (i ? 2 : 1), amount)

const getNextPrice = (
  price,
  i,
  sideSign,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => price - sideSign * (_.get(grid[i], 'PRICE_STEP') || _.last(grid).PRICE_STEP)

const getNextAmount = (
  amount,
  i,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => amount * (_.get(grid[i], 'X_AMOUNT') || _.last(grid).X_AMOUNT)

const getOrders = ({
  price,
  amount,
  count,
  sideSign,
  start = 0,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
  pricePrecision,
  quantityPrecision,
}) => {
  const res = _.range(0, count).reduce(
    (acc, i) => {
      if (acc.price < 0) return acc
      // const price = acc.price - sideSign * acc.price * 0.0055 * (i * 0.01 + 1)
      let price = getNextPrice(acc.price, i, sideSign, grid)
      // const amount = acc.amount * (i ? 2 : 1)
      const amount = getNextAmount(acc.amount, i, grid)
      let orders = [
        {
          price: precision(acc.price, pricePrecision),
          amount: precision(acc.amount, quantityPrecision),
          priceDiff: precision(acc.price - price),
        },
      ]
      if (i < start) {
        price = acc.price
        orders = []
      }
      return {
        ...acc,
        price,
        amount,
        orders: [...acc.orders, ...orders],
      }
    },
    { price, amount, orders: [] },
  )
  return res.orders
}

// const x = getOrders({
//   price: 1,
//   amount: 0.002,
//   count: 7,
//   sideSign: 1,
//   grid: [
//     { PRICE_STEP: 20, X_AMOUNT: 1 },
//     { PRICE_STEP: 20, X_AMOUNT: 3 },
//     { PRICE_STEP: 50, X_AMOUNT: 3 },
//     { PRICE_STEP: 60, X_AMOUNT: 1.6 },
//     { PRICE_STEP: 80, X_AMOUNT: 1.6 },
//     { PRICE_STEP: 120, X_AMOUNT: 2 },
//   ],
// })
// console.log(
//   x,
//   x.reduce((acc, o) => {
//     return acc + parseFloat(o.amount)
//   }, 0),
// )

const getPosSize = (
  positionAmount,
  initAmount,
  count,
  grid = [
    { PRICE_STEP: 1, X_AMOUNT: 1 },
    { PRICE_STEP: 1, X_AMOUNT: 2 },
  ],
) => {
  const orders = getOrders({
    price: 10000,
    amount: initAmount,
    count,
    sideSign: 1,
    grid,
  })
  const { total, i } = orders.reduce(
    (acc, order, i) => {
      if (positionAmount <= acc.total) {
        return acc
      }
      return { ...acc, total: acc.total + order.amount, i }
    },
    { total: 0, i: 0 },
  )
  return i + Math.min(positionAmount, total) / Math.max(positionAmount, total)
  // return Math.log(Math.abs(parseFloat(positionAmount)) / initAmount) / Math.log(2) + 1
}

// const grid = [
//   { PRICE_STEP: 20, X_AMOUNT: 1 },
//   { PRICE_STEP: 20, X_AMOUNT: 3 },
//   { PRICE_STEP: 50, X_AMOUNT: 3 },
//   { PRICE_STEP: 60, X_AMOUNT: 1.6 },
//   { PRICE_STEP: 80, X_AMOUNT: 1.6 },
//   { PRICE_STEP: 120, X_AMOUNT: 2 },
// ]
// console.log(getPosSize(0.008, 0.002, 7, grid))
// console.log(getPosSize(0.018, 0.002, 7, grid))
// console.log(getPosSize(0.028, 0.002, 7, grid))

// const conf = {
//   "SYMBOL": "BTCUSDT",
//   "SIDE": "SHORT",
//   "AMOUNT": "0.005",
//   "PRICE_TYPE": "distance",
//   "PRICE": 10000,
//   "PRICE_DISTANCE": 2,
//   "GRID": [
//     {
//       "PRICE_STEP": "40",
//       "X_AMOUNT": 1
//     },
//     {
//       "PRICE_STEP": "40",
//       "X_AMOUNT": 3
//     },
//     {
//       "PRICE_STEP": "100",
//       "X_AMOUNT": 3
//     },
//     {
//       "PRICE_STEP": "120",
//       "X_AMOUNT": 1.6
//     },
//     {
//       "PRICE_STEP": "160",
//       "X_AMOUNT": 1.6
//     },
//     {
//       "PRICE_STEP": "240",
//       "X_AMOUNT": 2
//     }
//   ],
//   "TP_MIN_PERCENT": "0.11",
//   "TP_MAX_PERCENT": 0.6,
//   "TP_MAX_COUNT": 6,
//   "SP_PERCENT": 0.1,
//   "SP_PERCENT_TRIGGER": 0.2,
//   "SL_PERCENT": "-5",
//   "TRADES_COUNT": 0,
//   "TRADES_TILL_STOP": 1000,
//   "DATETIME_RANGE": [
//     "2020-10-01T20:22:34.022Z",
//     "2020-11-26T20:22:34.022Z"
//   ],
//   "TP_GRID": [
//     {
//       "MIN_PERCENT": "0.3",
//       "MAX_PERCENT": "1",
//       "MAX_COUNT": 6
//     },
//     {
//       "MIN_PERCENT": "0.25",
//       "MAX_PERCENT": "0.9",
//       "MAX_COUNT": 6
//     },
//     {
//       "MIN_PERCENT": 0.18,
//       "MAX_PERCENT": 0.6,
//       "MAX_COUNT": 5
//     },
//     {
//       "MIN_PERCENT": 0.14,
//       "MAX_PERCENT": 0.5,
//       "MAX_COUNT": 4
//     },
//     {
//       "MIN_PERCENT": 0.11,
//       "MAX_PERCENT": 0.4,
//       "MAX_COUNT": 3
//     },
//     {
//       "MIN_PERCENT": 0.1,
//       "MAX_PERCENT": 0.3,
//       "MAX_COUNT": 3
//     }
//   ],
// }
// const posSize = getPosSize(Math.abs(parseFloat(-0.025)), conf.AMOUNT, conf.GRID.length + 1, conf.GRID)
// const posSize = getPosSize(0.025, 0.005, 7, conf.GRID)
// console.log(posSize)

const getOrdersAmount = (orders, key = 'origQty') =>
  _.reduce(orders, (acc, order) => acc + parseFloat(order[key]), 0)

const getTpOrdersCount = (amount, minAmount, maxOrders = 8) =>
  Math.min(maxOrders, Math.abs(Math.round(amount / minAmount)))

const getTpOrders = ({
  amount,
  minAmount,
  minPrice,
  maxPrice,
  sideSign,
  maxOrders = 8,
  pricePrecision,
  quantityPrecision,
}) => {
  const count = getTpOrdersCount(amount, minAmount, maxOrders)
  const interval = Math.abs(minPrice - maxPrice) / (count - 1)
  const ordAmount = precision(
    -sideSign * Math.max(minAmount, Math.abs(amount) / count),
    quantityPrecision,
  )
  const orders = _.range(0, count).map((i) => {
    const price = precision(minPrice + i * sideSign * interval, pricePrecision)
    return { price, amount: ordAmount }
  })
  return orders
}

// console.log(getTpOrders({
//   amount: 0.029,
//   minAmount: 0.001,
//   minPrice: 11327.48,
//   maxPrice: 11385.73,
//   sideSign: -1,
//   maxOrders: 6,
//   pricePrecision: 2,
//   quantityPrecision: 3,
// }))

module.exports = {
  getDecimals,
  precision,
  getPLPrice,
  getPLPerc,
  getOrders,
  getFullSize,
  getOrdersAmount,
  getTpOrdersCount,
  getTpOrders,
  getNextPrice,
  getNextAmount,
  getPosSize,
}
