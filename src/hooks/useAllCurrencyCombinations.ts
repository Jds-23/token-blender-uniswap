import { Currency, Token } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { ADDITIONAL_BASES, BASES_TO_CHECK_TRADES_AGAINST, CUSTOM_BASES } from '../constants/routing'
import { useActiveWeb3React } from './web3'

export function useAllCurrencyCombinations(currencyA?: Currency, currencyB?: Currency): [Token, Token][] {
  const { chainId } = useActiveWeb3React()

  const [tokenA, tokenB] = chainId ? [currencyA?.wrapped, currencyB?.wrapped] : [undefined, undefined]

  const bases: Token[] = useMemo(() => {
    if (!chainId) return []

    const common = BASES_TO_CHECK_TRADES_AGAINST[chainId] ?? []
    const additionalA = tokenA ? ADDITIONAL_BASES[chainId]?.[tokenA.address] ?? [] : []
    const additionalB = tokenB ? ADDITIONAL_BASES[chainId]?.[tokenB.address] ?? [] : []

    return [...common, ...additionalA, ...additionalB]
  }, [chainId, tokenA, tokenB])

  const basePairs: [Token, Token][] = useMemo(
    () => bases.flatMap((base): [Token, Token][] => bases.map((otherBase) => [base, otherBase])),
    [bases]
  )

  return useMemo(
    () =>
      tokenA && tokenB
        ? [
            // the direct pair
            [tokenA, tokenB],
            // token A against all bases
            ...bases.map((base): [Token, Token] => [tokenA, base]),
            // token B against all bases
            ...bases.map((base): [Token, Token] => [tokenB, base]),
            // each base against all bases
            ...basePairs,
          ]
            .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
            .filter(([t0, t1]) => t0.address !== t1.address)
            .filter(([tokenA, tokenB]) => {
              if (!chainId) return true
              const customBases = CUSTOM_BASES[chainId]

              const customBasesA: Token[] | undefined = customBases?.[tokenA.address]
              const customBasesB: Token[] | undefined = customBases?.[tokenB.address]

              if (!customBasesA && !customBasesB) return true

              if (customBasesA && !customBasesA.find((base) => tokenB.equals(base))) return false
              if (customBasesB && !customBasesB.find((base) => tokenA.equals(base))) return false

              return true
            })
        : [],
    [tokenA, tokenB, bases, basePairs, chainId]
  )
}
export function useAllCurrencyCombinationsArr(currencyAArr: (Currency|undefined)[], currencyB?: Currency): [Token, Token][][] {
  const { chainId } = useActiveWeb3React()

  const [tokenAArr, tokenB] = chainId ? [currencyAArr.map(currencyA=>currencyA?.wrapped), currencyB?.wrapped] : [currencyAArr.map(currencyA=>undefined), undefined]

  const basesArr: (Token)[][] = useMemo(() => {
    if (!chainId) return []

    const common = BASES_TO_CHECK_TRADES_AGAINST[chainId] ?? []
    const additionalAArr = tokenAArr.map(tokenA=>tokenA ? ADDITIONAL_BASES[chainId]?.[tokenA.address] ?? [] : [])
    const additionalB = tokenB ? ADDITIONAL_BASES[chainId]?.[tokenB.address] ?? [] : []

    return (additionalAArr.map(additionalA=>[...common, ...additionalA, ...additionalB]))
  }, [chainId, tokenAArr, tokenB])

  const basePairsArr: [Token, Token][][] = useMemo(
    () => (basesArr.map(bases=>bases.flatMap((base): [Token, Token][] => bases.map((otherBase) => [base, otherBase])))),
    [basesArr]
  )

  return useMemo(
    () =>tokenAArr.map(
      (tokenA,i)=>tokenA && tokenB
      ? [
          // the direct pair
          [tokenA, tokenB],
          // token A against all bases
          ...basesArr[i].map((base): [Token, Token] => [tokenA, base]),
          // token B against all bases
          ...basesArr[i].map((base): [Token, Token] => [tokenB, base]),
          // each base against all bases
          ...basePairsArr[i],
        ]
          .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
          .filter(([t0, t1]) => t0.address !== t1.address)
          .filter(([tokenA, tokenB]) => {
            if (!chainId) return true
            const customBases = CUSTOM_BASES[chainId]
  
            const customBasesA: Token[] | undefined = customBases?.[tokenA.address]
            const customBasesB: Token[] | undefined = customBases?.[tokenB.address]
  
            if (!customBasesA && !customBasesB) return true
  
            if (customBasesA && !customBasesA.find((base) => tokenB.equals(base))) return false
            if (customBasesB && !customBasesB.find((base) => tokenA.equals(base))) return false
  
            return true
          })
          : []
      )
    ,
    [tokenAArr, tokenB, basesArr, basePairsArr, chainId]
  )
}
