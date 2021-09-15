import { useBlendContract } from './useContract'
import { Router, Trade as V2Trade } from '@uniswap/v2-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import { TransactionResponse } from '@ethersproject/providers'
import { useCallback } from 'react';

const useBlendCallback = (  
  tradeArr: (V2Trade<Currency, Currency, TradeType> | undefined)[], // trade to execute, required
  // allowedSlippage: Percent, // in bips
  outputAmount: CurrencyAmount<Currency> | undefined
): [() => Promise<void>] => {
  const Contract = useBlendContract();
  const inputTokens=tradeArr.map(trade=>({
    token:trade?.inputAmount.currency.isToken&&trade?.inputAmount.currency.address,
    amount:trade?.inputAmount,
    tokenToNativePath:trade?.route
  }))
const inputLPs:any=[];
const minOutputAmount=outputAmount


  const blend = useCallback(async (): Promise<void> =>{
    if (!Contract) {
      console.error('tokenContract is null')
      return
    }
    if (!minOutputAmount) {
      console.error('minOutputAmount is null')
      return
    }
    if (inputTokens.length === 0) {
      console.error('no Input tokens')
      return
    }
    return Contract?.swapTokensToNative(
      inputTokens,
      inputLPs,
      minOutputAmount,
    ).then((response: TransactionResponse) => {
      console.log(response)
    })
    .catch((error: Error) => {
      console.debug('Failed to approve token', error)
      throw error
    }) 
  },[Contract,
    inputTokens,
    inputLPs,
    minOutputAmount,])
return [blend]
  
}

export default useBlendCallback


