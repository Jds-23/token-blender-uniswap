import { MaxUint256 } from '@ethersproject/constants'
import { TransactionResponse } from '@ethersproject/providers'
import { CurrencyAmount, Percent, Currency, TradeType } from '@uniswap/sdk-core'
import { Trade as V2Trade } from '@uniswap/v2-sdk'
import { Trade as V3Trade } from '@uniswap/v3-sdk'
import { useCallback, useMemo } from 'react'
import { BLEND_ADDRESS, SWAP_ROUTER_ADDRESSES, V2_ROUTER_ADDRESS } from '../constants/addresses'
import { useTransactionAdder, useHasPendingApproval,useHasPendingApprovalArr } from '../state/transactions/hooks'
import { calculateGasMargin } from '../utils/calculateGasMargin'
import { useTokenContract, useTokenContractArr } from './useContract'
import { useActiveWeb3React } from './web3'
import { useTokenAllowance, useTokenAllowanceArr } from './useTokenAllowance'

export enum ApprovalState {
  UNKNOWN = 'UNKNOWN',
  NOT_APPROVED = 'NOT_APPROVED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(
  amountToApprove?: CurrencyAmount<Currency>,
  spender?: string
): [ApprovalState, () => Promise<void>] {
  const { account, chainId } = useActiveWeb3React()
  const token = amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined
  const currentAllowance = useTokenAllowance(token, account ?? undefined, spender)
  const pendingApproval = useHasPendingApproval(token?.address, spender)

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency.isNative) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [amountToApprove, currentAllowance, pendingApproval, spender])

  const tokenContract = useTokenContract(token?.address)
  const addTransaction = useTransactionAdder()

  const approve = useCallback(async (): Promise<void> => {
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return
    }
    if (!chainId) {
      console.error('no chainId')
      return
    }

    if (!token) {
      console.error('no token')
      return
    }

    if (!tokenContract) {
      console.error('tokenContract is null')
      return
    }

    if (!amountToApprove) {
      console.error('missing amount to approve')
      return
    }

    if (!spender) {
      console.error('no spender')
      return
    }

    let useExact = false
    const estimatedGas = await tokenContract.estimateGas.approve(spender, MaxUint256).catch(() => {
      // general fallback for tokens who restrict approval amounts
      useExact = true
      return tokenContract.estimateGas.approve(spender, amountToApprove.quotient.toString())
    })

    return tokenContract
      .approve(spender, useExact ? amountToApprove.quotient.toString() : MaxUint256, {
        gasLimit: calculateGasMargin(chainId, estimatedGas),
      })
      .then((response: TransactionResponse) => {
        addTransaction(response, {
          summary: 'Approve ' + amountToApprove.currency.symbol,
          approval: { tokenAddress: token.address, spender },
        })
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [approvalState, token, tokenContract, amountToApprove, spender, addTransaction, chainId])

  return [approvalState, approve]
}
export function useApproveCallbackArr(
  amountToApproveArr: (CurrencyAmount<Currency> | undefined)[],
  spender?: string
): [ApprovalState[], (i:number) => Promise<void>] {
  const { account, chainId } = useActiveWeb3React()
  const tokenArr = (amountToApproveArr.map(amountToApprove=>amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined))
  const currentAllowanceArr = useTokenAllowanceArr(tokenArr, account ?? undefined, spender)
  const pendingApprovalArr = useHasPendingApprovalArr(tokenArr.map(token =>token?.address), spender)

  // check the current approval status
  const approvalStateArr: ApprovalState[] = useMemo(() => {
    return amountToApproveArr.map((amountToApprove,i)=>{if (!amountToApprove || !spender) {
      return ApprovalState.UNKNOWN}
    if (amountToApprove.currency.isNative) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowanceArr[i]) {
      return ApprovalState.UNKNOWN}

    // amountToApprove will be defined if currentAllowance is
    return currentAllowanceArr[i]?.lessThan(amountToApprove)
      ? pendingApprovalArr[i]
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED})
  }, [amountToApproveArr, currentAllowanceArr, pendingApprovalArr, spender])

  const tokenContractArr = useTokenContractArr(tokenArr.map(token =>token?.address))
  const addTransaction = useTransactionAdder()

  const approve = useCallback(async (i:number): Promise<void> => {
    if (approvalStateArr[i] !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return
    }
    if (!chainId) {
      console.error('no chainId')
      return
    }

    if (!tokenArr[i]) {
      console.error('no token')
      return
    }

    if (!tokenContractArr[i]) {
      console.error('tokenContract is null')
      return
    }

    if (!amountToApproveArr[i]) {
      console.error('missing amount to approve')
      return
    }

    if (!spender) {
      console.error('no spender')
      return
    }

    let useExact = false
    const estimatedGas = await tokenContractArr[i].estimateGas.approve(spender, MaxUint256).catch(() => {
      // general fallback for tokens who restrict approval amounts
      useExact = true
      return tokenContractArr[i].estimateGas.approve(spender, amountToApproveArr[i]?.quotient.toString()+"")
    })

    return tokenContractArr[i]
      .approve(spender, useExact ? amountToApproveArr[i]?.quotient.toString()+"" : MaxUint256, {
        gasLimit: calculateGasMargin(chainId, estimatedGas),
      })
      .then((response: TransactionResponse) => {
        addTransaction(response, {
          summary: 'Approve ' + amountToApproveArr[i]?.currency.symbol,
          approval: { tokenAddress: tokenArr[i]?.address+"", spender },
        })
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [approvalStateArr, tokenArr, tokenContractArr, amountToApproveArr, spender, addTransaction, chainId])

  return [approvalStateArr,approve]
}

// wraps useApproveCallback in the context of a swap
export function useApproveCallbackFromTrade(
  trade: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent
) {
  const { chainId } = useActiveWeb3React()
  const v3SwapRouterAddress = chainId ? SWAP_ROUTER_ADDRESSES[chainId] : undefined
  const amountToApprove = useMemo(
    () => (trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined),
    [trade, allowedSlippage]
  )
  return useApproveCallback(
    amountToApprove,
    chainId
      ? trade instanceof V2Trade
        ? V2_ROUTER_ADDRESS[chainId]
        : trade instanceof V3Trade
        ? v3SwapRouterAddress
        : undefined
      : undefined
  )
}


export function useApproveCallbackFromBlendArr(
  tradeArr: (V2Trade<Currency, Currency, TradeType> | undefined)[],
  allowedSlippage: Percent
) {
  const { chainId } = useActiveWeb3React()
  const amountToApproveArr = useMemo(
    () => tradeArr.map(trade=>(trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined)),
    [tradeArr, allowedSlippage]
  )
  return useApproveCallbackArr(
    amountToApproveArr,
    chainId
      ?  BLEND_ADDRESS
      : undefined
  )
}
