import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { Pair, Trade } from '@uniswap/v2-sdk'
import { useMemo } from 'react'
import { isTradeBetter } from 'utils/isTradeBetter'
import { BETTER_TRADE_LESS_HOPS_THRESHOLD } from '../constants/misc'
import { useAllCurrencyCombinations, useAllCurrencyCombinationsArr } from './useAllCurrencyCombinations'
import { PairState, useV2Pairs } from './useV2Pairs'

function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Pair[] {
  const allCurrencyCombinations = useAllCurrencyCombinations(currencyA, currencyB)

  const allPairs = useV2Pairs(allCurrencyCombinations)
  // only pass along valid pairs, non-duplicated pairs
  return useMemo(
    () =>
      Object.values(
        allPairs
          // filter out invalid pairs
          .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      ),
    [allPairs]
  )
}
function useAllCommonPairsArr(currencyAArr: (Currency| undefined)[], currencyB?: Currency): Pair[][] {
  const allCurrencyCombinationsArr = useAllCurrencyCombinationsArr(currencyAArr, currencyB)
  const allPairs = useV2Pairs(allCurrencyCombinationsArr.flat())
  let i=-1;
  const allPairsArr:[PairState, Pair | null][][]=allCurrencyCombinationsArr.map(s1=>s1.map(s2=>{i++; return allPairs[i];}))
  // only pass along valid pairs, non-duplicated pairs
  return useMemo(
    () =>{
      return allPairsArr.map(allPairs=>Object.values(
        allPairs
          // filter out invalid pairs
          .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      ))
    } ,
    [allPairsArr]
  )
}

const MAX_HOPS = 3

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export function useV2TradeExactIn(
  currencyAmountIn?: CurrencyAmount<Currency>,
  currencyOut?: Currency,
  { maxHops = MAX_HOPS } = {}
): Trade<Currency, Currency, TradeType.EXACT_INPUT> | null {
  const allowedPairs = useAllCommonPairs(currencyAmountIn?.currency, currencyOut)

  return useMemo(() => {
    if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      if (maxHops === 1) {
        return (
          Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: 1, maxNumResults: 1 })[0] ??
          null
        ) // for getting path
      }
      // search through trades with varying hops, find best trade out of them
      let bestTradeSoFar: Trade<Currency, Currency, TradeType.EXACT_INPUT> | null = null
      for (let i = 1; i <= maxHops; i++) {
        const currentTrade: Trade<Currency, Currency, TradeType.EXACT_INPUT> | null =
          Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: i, maxNumResults: 1 })[0] ??
          null
        // if current trade is best yet, save it
        if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
          bestTradeSoFar = currentTrade
        }
      }
      return bestTradeSoFar
    }

    return null
  }, [allowedPairs, currencyAmountIn, currencyOut, maxHops])
}

export function useV2TradeExactInArr(
  currencyAmountInArr: (CurrencyAmount<Currency> | undefined)[],
  currencyOut?: Currency,
  { maxHops = MAX_HOPS } = {}
): (Trade<Currency, Currency, TradeType.EXACT_INPUT> | null)[] {
  const allowedPairsArr = useAllCommonPairsArr(currencyAmountInArr.map(currencyAmountIn=>currencyAmountIn?.currency), currencyOut)

  return useMemo(() => {
    return currencyAmountInArr.map((currencyAmountIn,i)=>{
      if (currencyAmountIn && currencyOut && allowedPairsArr[i].length > 0) {
        return (
          Trade.bestTradeExactIn(allowedPairsArr[i], currencyAmountIn, currencyOut, { maxHops: 1, maxNumResults: 1 })[0] ?? null
        ) }
        return null;
      })
      // for getting path
      // }
      // search through trades with varying hops, find best trade out of them
      // let bestTradeSoFar: Trade<Currency, Currency, TradeType.EXACT_INPUT> | null = null
      // for (let i = 1; i <= maxHops; i++) {
      //   const currentTrade: Trade<Currency, Currency, TradeType.EXACT_INPUT> | null =
      //     Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: i, maxNumResults: 1 })[0] ??
      //     null
      //   // if current trade is best yet, save it
      //   if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
      //     bestTradeSoFar = currentTrade
      //   }
      // }
      // return bestTradeSoFar
  }, [allowedPairsArr, currencyAmountInArr, currencyOut, maxHops])
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export function useV2TradeExactOut(
  currencyIn?: Currency,
  currencyAmountOut?: CurrencyAmount<Currency>,
  { maxHops = MAX_HOPS } = {}
): Trade<Currency, Currency, TradeType.EXACT_OUTPUT> | null {
  const allowedPairs = useAllCommonPairs(currencyIn, currencyAmountOut?.currency)

  return useMemo(() => {
    if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      if (maxHops === 1) {
        return (
          Trade.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: 1, maxNumResults: 1 })[0] ??
          null
        )
      }
      // search through trades with varying hops, find best trade out of them
      let bestTradeSoFar: Trade<Currency, Currency, TradeType.EXACT_OUTPUT> | null = null
      for (let i = 1; i <= maxHops; i++) {
        const currentTrade =
          Trade.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: i, maxNumResults: 1 })[0] ??
          null
        if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
          bestTradeSoFar = currentTrade
        }
      }
      return bestTradeSoFar
    }
    return null
  }, [currencyIn, currencyAmountOut, allowedPairs, maxHops])
}
