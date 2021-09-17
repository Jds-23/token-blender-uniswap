import { useBlendContract } from './useContract'
import { Router, Trade as V2Trade } from '@uniswap/v2-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import { TransactionResponse } from '@ethersproject/providers'
import { useCallback } from 'react';
import JSBI from 'jsbi'
import { parseUnits } from '@ethersproject/units';

const useBlendCallback = (  
  tradeArr: (V2Trade<Currency, Currency, TradeType> | undefined)[], // trade to execute, required
  outputAmount: CurrencyAmount<Currency> | undefined
): [() => Promise<void>] => {
  const Contract = useBlendContract();
  const inputTokens=tradeArr.map(trade=>({
    token:trade?.inputAmount.currency.isToken&&trade?.inputAmount.currency.address,
    amount:trade?.inputAmount.toSignificant(6),
    tokenToNativePath:trade?.inputAmount.currency.isToken&&[trade?.inputAmount.currency.address,"0xc778417E063141139Fce010982780140Aa0cD5Ab"]
  }))
  const inputLPs:any=[];
  const tokenToOutputPath=outputAmount?.currency.isToken?["0xc778417E063141139Fce010982780140Aa0cD5Ab",outputAmount?.currency.address]:[]
  let minOutputAmount:any;
  if(outputAmount===undefined) {
    minOutputAmount=null
  } else {
    minOutputAmount=outputAmount.toSignificant(6)
  }
// if(outputAmount)
console.log(minOutputAmount)
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

      if(outputAmount?.currency.isNative)
      {
        return Contract?.swapTokensToNative(
          inputTokens,
          inputLPs,
          0,
        ).then((response: TransactionResponse) => {
          console.log(response)
        })
        .catch((error: Error) => {
          console.log('Failed to blend', error)
          // throw error
        }) 
      }
console.log("...hey")
debugger
    return Contract?.swapTokensToToken(
      inputTokens,
      inputLPs,
      tokenToOutputPath,
      0,
    ).then((response: TransactionResponse) => {
      console.log(response)
    })
    .catch((error: Error) => {
      console.log('Failed to blend', error)
      // throw error
    })
  },[Contract,
    inputTokens,
    inputLPs,
    0,])
return [blend]
  
}

export default useBlendCallback


