import { Token, CurrencyAmount } from '@uniswap/sdk-core'
import { Erc20 } from 'abis/types'
import { useMemo } from 'react'
import { ERC20Interface } from 'state/wallet/hooks'
import { useMultipleContractSingleData, useSingleCallResult } from '../state/multicall/hooks'
import { useContractArr, useTokenContract, useTokenContractArr } from './useContract'

export function useTokenAllowance(token?: Token, owner?: string, spender?: string): CurrencyAmount<Token> | undefined {
  const contract = useTokenContract(token?.address, false)

  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const allowance = useSingleCallResult(contract, 'allowance', inputs).result

  return useMemo(
    () => (token && allowance ? CurrencyAmount.fromRawAmount(token, allowance.toString()) : undefined),
    [token, allowance]
  )
}
export function useTokenAllowanceArr(tokenArr: (Token| undefined)[], owner?: string, spender?: string): (CurrencyAmount<Token> | undefined)[] {
  const contractArr = useContractArr(tokenArr.map(token=>token?.address), false)

  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const allowanceArr = useMultipleContractSingleData(tokenArr.map(token=>token?.address),ERC20Interface, 'allowance', inputs).map(i=>i.result)

  const modAllowanceArr: string[]=allowanceArr.map(allowance=>allowance?allowance.toString():"0")

  return useMemo(
    () => (tokenArr.map((token,i)=>token && allowanceArr[i] ? CurrencyAmount.fromRawAmount(token, modAllowanceArr[i]) : undefined)),
    [tokenArr, allowanceArr]
  )
}
