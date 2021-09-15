import { t } from '@lingui/macro'
import JSBI from 'jsbi'
import { Trade as V3Trade } from '@uniswap/v3-sdk'
import { useBestV3TradeExactIn, useBestV3TradeExactOut, V3TradeState } from '../../hooks/useBestV3Trade'
import useENS from '../../hooks/useENS'
import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, NativeCurrency, Percent, TradeType } from '@uniswap/sdk-core'
import { Trade as V2Trade } from '@uniswap/v2-sdk'
import { ParsedQs } from 'qs'
import { useCallback, useEffect, useState } from 'react'
import { useActiveWeb3React } from '../../hooks/web3'
import { useCurrency, useCurrencyArr } from '../../hooks/Tokens'
import useSwapSlippageTolerance from '../../hooks/useSwapSlippageTolerance'
import { Version } from '../../hooks/useToggledVersion'
import { useV2TradeExactIn, useV2TradeExactInArr, useV2TradeExactOut } from '../../hooks/useV2Trade'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { AppState } from '../index'
import { useCurrencyBalances } from '../wallet/hooks'
import { addInput, Field, removeInput, selectCurrency, setRecipient, typeInput } from './actions'
import { BlendState } from './reducer'
import { useUserSingleHopOnly } from 'state/user/hooks'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { Token } from 'graphql'

export function useBlendState(): AppState['blend'] {
  return useAppSelector((state) => state.blend)
}

export function useBlendActionHandlers(): {
  onCurrencySelection: (field: Field, currency: Currency, indexOfInput: number | undefined) => void
  onUserInput: (typedValue: string, indexOfInput: number | undefined) => void
  onChangeRecipient: (recipient: string | null) => void
  addInputBox: () => void
  removeInputBox: (indexOfInput: number) => void
} {
  const dispatch = useAppDispatch()
  const onCurrencySelection = useCallback(
    (field: Field, currency: Currency, indexOfInput: number | undefined) => {
      dispatch(
        selectCurrency({
          field,
          currencyId: currency.isToken ? currency.address : currency.isNative ? 'ETH' : '',
          indexOfInput,
        })
      )
    },
    [dispatch]
  )

  const onUserInput = useCallback(
    (typedValue: string, indexOfInput: number | undefined) => {
      dispatch(typeInput({ typedValue, indexOfInput }))
    },
    [dispatch]
  )

  const addInputBox = useCallback(() => {
    dispatch(addInput())
  }, [dispatch])

  const removeInputBox = useCallback(
    (indexOfInput: number) => {
      dispatch(removeInput({ indexOfInput }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  return {
    onCurrencySelection,
    onUserInput,
    onChangeRecipient,
    addInputBox,
    removeInputBox,
  }
}

// try to parse a user entered amount for a given token
export function tryParseAmount<T extends Currency>(value?: string, currency?: T): CurrencyAmount<T> | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error)
  }
  // necessary for all paths to return a value
  return undefined
}

export function addOutput<T extends Currency>(inputArr:(CurrencyAmount<T> | undefined)[], currency?: T): CurrencyAmount<T> | undefined{
  if (!currency) {
    return undefined
  }
  let amount = CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(0))
  inputArr.map(input=>{
    amount=amount.add(input?input:CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(0)))
  })
  return amount
}

// const BAD_RECIPIENT_ADDRESSES: { [address: string]: true } = {
//   '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': true, // v2 factory
//   '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a': true, // v2 router 01
//   '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': true, // v2 router 02
// }

/**
 * Returns true if any of the pairs or tokens in a trade have the given checksummed address
 * @param trade to check for the given address
 * @param checksummedAddress address to check in the pairs and tokens
 */
// function involvesAddress(
//   trade: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType>,
//   checksummedAddress: string
// ): boolean {
//   const path = trade instanceof V2Trade ? trade.route.path : trade.route.tokenPath
//   return (
//     path.some((token) => token.address === checksummedAddress) ||
//     (trade instanceof V2Trade
//       ? trade.route.pairs.some((pair) => pair.liquidityToken.address === checksummedAddress)
//       : false)
//   )
// }

// from the current swap inputs, compute the best trade and return it.
export function useDerivedBlendInfo(): {
  relevantTokenBalances: (CurrencyAmount<Currency> | undefined)[]
  inputCurrencyArr: (Currency | null | undefined)[]
  outputCurrency: Currency | null | undefined
  outputAmount:CurrencyAmount<Currency> | undefined
  // currencies: { [field in Field]?: Currency | null }
  // currencyBalances: { [field in Field]?: CurrencyAmount<Currency> }
  // parsedAmount: CurrencyAmount<Currency> | undefined
  // inputError?: string
  v2TradeArr: (V2Trade<Currency, Currency, TradeType> | undefined)[]
  // v3TradeState: { trade: V3Trade<Currency, Currency, TradeType> | null; state: V3TradeState }
  // toggledTrade: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | undefined
  allowedSlippage: Percent
} {
  const { account } = useActiveWeb3React()

  const [singleHopOnly] = useUserSingleHopOnly()

  const {
    independentField,
    typedValues,
    [Field.INPUT]: inputCurrencyIdArr,
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
  } = useBlendState()

  const inputCurrencyArr = useCurrencyArr(inputCurrencyIdArr.map((item) => item.currencyId))
  const outputCurrency = useCurrency(outputCurrencyId)
  // const recipientLookup = useENS(recipient ?? undefined)
  // const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    ...inputCurrencyArr,
    outputCurrency ?? undefined,
  ])

  const isExactIn: boolean = independentField === Field.INPUT
  const parsedAmountArr = inputCurrencyArr.map((inputCurrency, i) =>
    tryParseAmount(typedValues[i], inputCurrency ?? undefined)
  )

  // const bestV2TradeExactIn = useV2TradeExactIn(parsedAmount, outputCurrency ?? undefined, {
  //   maxHops: singleHopOnly ? 1 : undefined,
  // })
  const bestV2TradeExactInArr = useV2TradeExactInArr(parsedAmountArr, outputCurrency ?? undefined, {
    maxHops: singleHopOnly ? 1 : undefined,
  })
  const allowedSlippage = useSwapSlippageTolerance(bestV2TradeExactInArr[0]?bestV2TradeExactInArr[0]:undefined )

  const outputAmount = addOutput(bestV2TradeExactInArr.map(bestV2TradeExactIn=>bestV2TradeExactIn?.minimumAmountOut(allowedSlippage)) ,outputCurrency ?? undefined)
  // const outputAmountString= outputAmount
  // const bestV3TradeExactIn = useBestV3TradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined)
  // const bestV3TradeExactOut = useBestV3TradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined)

  // const v2Trade = isExactIn ? bestV2TradeExactIn : bestV2TradeExactOut
  // const v3Trade = (isExactIn ? bestV3TradeExactIn : bestV3TradeExactOut) ?? undefined

  // const currencyBalances = {
  //   [Field.INPUT]: relevantTokenBalances,
  //   [Field.OUTPUT]: relevantTokenBalances[relevantTokenBalances.length - 1],
  // }

  // const currencies: { [field in Field]?: Currency | null } = {
  //   [Field.INPUT]: inputCurrencyArr,
  //   [Field.OUTPUT]: outputCurrency,
  // }

  // let inputError: string | undefined
  // if (!account) {
  //   inputError = t`Connect Wallet`
  // }

  // if (!parsedAmount) {
  //   inputError = inputError ?? t`Enter an amount`
  // }

  // if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
  //   inputError = inputError ?? t`Select a token`
  // }

  // const formattedTo = isAddress(to)
  // if (!to || !formattedTo) {
  //   inputError = inputError ?? t`Enter a recipient`
  // } else {
  //   if (
  //     BAD_RECIPIENT_ADDRESSES[formattedTo] ||
  //     (bestV2TradeExactIn && involvesAddress(bestV2TradeExactIn, formattedTo)) ||
  //     (bestV2TradeExactOut && involvesAddress(bestV2TradeExactOut, formattedTo))
  //   ) {
  //     inputError = inputError ?? t`Invalid recipient`
  //   }
  // }

  // const toggledTrade = (toggledVersion === Version.v2 ? v2Trade : v3Trade.trade) ?? undefined

  // // compare input balance to max input based on version
  // const [balanceIn, amountIn] = [currencyBalances[Field.INPUT], toggledTrade?.maximumAmountIn(allowedSlippage)]

  // if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
  //   inputError = t`Insufficient ${amountIn.currency.symbol} balance`
  // }

  return {
    relevantTokenBalances,
    inputCurrencyArr,
    outputCurrency,
    outputAmount,
    // parsedAmount,
    // inputError,
    v2TradeArr: bestV2TradeExactInArr.map(bestV2TradeExactIn=>bestV2TradeExactIn??undefined) ,
    // v3TradeState: v3Trade,
    // toggledTrade,
    allowedSlippage,
  }
}

// function parseCurrencyFromURLParameter(urlParam: any): string {
//   if (typeof urlParam === 'string') {
//     const valid = isAddress(urlParam)
//     if (valid) return valid
//     if (urlParam.toUpperCase() === 'ETH') return 'ETH'
//   }
//   return ''
// }

// function parseTokenAmountURLParameter(urlParam: any): string {
//   return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
// }

// function parseIndependentFieldURLParameter(urlParam: any): Field {
//   return typeof urlParam === 'string' && urlParam.toLowerCase() === 'output' ? Field.OUTPUT : Field.INPUT
// }

// const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
// const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
// function validatedRecipient(recipient: any): string | null {
//   if (typeof recipient !== 'string') return null
//   const address = isAddress(recipient)
//   if (address) return address
//   if (ENS_NAME_REGEX.test(recipient)) return recipient
//   if (ADDRESS_REGEX.test(recipient)) return recipient
//   return null
// }

// export function queryParametersToSwapState(parsedQs: ParsedQs): SwapState {
//   let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency)
//   let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency)
//   if (inputCurrency === '' && outputCurrency === '') {
//     // default to ETH input
//     inputCurrency = 'ETH'
//   } else if (inputCurrency === outputCurrency) {
//     // clear output if identical
//     outputCurrency = ''
//   }

//   const recipient = validatedRecipient(parsedQs.recipient)

//   return {
//     [Field.INPUT]: {
//       currencyId: inputCurrency,
//     },
//     [Field.OUTPUT]: {
//       currencyId: outputCurrency,
//     },
//     typedValue: parseTokenAmountURLParameter(parsedQs.exactAmount),
//     independentField: parseIndependentFieldURLParameter(parsedQs.exactField),
//     recipient,
//   }
// }

// updates the swap state to use the defaults for a given network
// export function useDefaultsFromURLSearch():
//   | { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined }
//   | undefined {
//   const { chainId } = useActiveWeb3React()
//   const dispatch = useAppDispatch()
//   const parsedQs = useParsedQueryString()
//   const [result, setResult] =
//     useState<{ inputCurrencyId: string | undefined; outputCurrencyId: string | undefined } | undefined>()

//   useEffect(() => {
//     if (!chainId) return
//     const parsed = queryParametersToSwapState(parsedQs)
//     const inputCurrencyId = parsed[Field.INPUT].currencyId ?? undefined
//     const outputCurrencyId = parsed[Field.OUTPUT].currencyId ?? undefined

//     dispatch(
//       replaceSwapState({
//         typedValue: parsed.typedValue,
//         field: parsed.independentField,
//         inputCurrencyId,
//         outputCurrencyId,
//         recipient: parsed.recipient,
//       })
//     )

//     setResult({ inputCurrencyId, outputCurrencyId })
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dispatch, chainId])

//   return result
// }
