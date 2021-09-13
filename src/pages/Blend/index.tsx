import AppBody from '../AppBody'
import { ArrowWrapper, Wrapper } from '../../components/swap/styleds'
import BlendHeader from '../../components/blend/BlendHeader'
import useToggledVersion from 'hooks/useToggledVersion'
import { AutoColumn } from 'components/Column'
import { Trans } from '@lingui/macro'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import {
    useDefaultsFromURLSearch,
    useDerivedSwapInfo,
    useSwapActionHandlers,
    useSwapState,
  } from '../../state/swap/hooks'
  import { Field } from '../../state/swap/actions'
import { useCallback, useContext, useMemo, useState } from 'react'
import useWrapCallback, { WrapType } from 'hooks/useWrapCallback'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { Plus } from 'react-feather'
import { ThemeContext } from 'styled-components/macro'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'



const Blend = () => {
    const toggledVersion = useToggledVersion()

    const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
    const { independentField, typedValue, recipient } = useSwapState()
    const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
    


    const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

    const handleTypeInput = useCallback(
        (value: string) => {
          onUserInput(Field.INPUT, value)
        },
        [onUserInput]
      )
      const handleTypeOutput = useCallback(
        (value: string) => {
          onUserInput(Field.OUTPUT, value)
        },
        [onUserInput]
      )
    

const {
    v2Trade,
    v3TradeState: { trade: v3Trade, state: v3TradeState },
    toggledTrade: trade,
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
  } = useDerivedSwapInfo(toggledVersion)

  

  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
            [Field.INPUT]: parsedAmount,
            [Field.OUTPUT]: parsedAmount,
          }
        : {
            [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
            [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
          },
    [independentField, parsedAmount, showWrap, trade]
  )

  const fiatValueInput = useUSDCValue(parsedAmounts[Field.INPUT])
  const fiatValueOutput = useUSDCValue(parsedAmounts[Field.OUTPUT])

  const priceImpact = computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const maxInputAmount: CurrencyAmount<Currency> | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
  }, [maxInputAmount, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency) => onCurrencySelection(Field.OUTPUT, outputCurrency),
    [onCurrencySelection]
  )
  const theme = useContext(ThemeContext)


  return (
    <>
      <AppBody>
          <BlendHeader allowedSlippage={allowedSlippage}/>
        <Wrapper>
        <AutoColumn gap={'md'}>
        <div style={{ display: 'relative' }}>
             <CurrencyInputPanel
                label={
                //   independentField === Field.OUTPUT && !showWrap ? 
                  <Trans>From (at most)</Trans> 
                //   : <Trans>From</Trans>
                }
                value={formattedAmounts[Field.INPUT]}
                showMaxButton={showMaxButton}
                currency={currencies[Field.INPUT]}
                onUserInput={handleTypeInput}
                onMax={handleMaxInput}
                fiatValue={fiatValueInput ?? undefined}
                onCurrencySelect={handleInputSelect}
                otherCurrency={currencies[Field.OUTPUT]}
                showCommonBases={true}
                id="swap-currency-input"
              />
             <CurrencyInputPanel
                label={
                //   independentField === Field.OUTPUT && !showWrap ? 
                  <Trans>From (at most)</Trans> 
                //   : <Trans>From</Trans>
                }
                value={formattedAmounts[Field.INPUT]}
                showMaxButton={showMaxButton}
                currency={currencies[Field.INPUT]}
                onUserInput={handleTypeInput}
                onMax={handleMaxInput}
                fiatValue={fiatValueInput ?? undefined}
                onCurrencySelect={handleInputSelect}
                otherCurrency={currencies[Field.OUTPUT]}
                showCommonBases={true}
                id="swap-currency-input"
              />
              <ArrowWrapper clickable>
                <Plus
                  size="16"
                  onClick={() => {
                    // setApprovalSubmitted(false) // reset 2 step UI for approvals
                    // onSwitchTokens()
                  }}
                  color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.text1 : theme.text3}
                />
              </ArrowWrapper>
              <CurrencyInputPanel
                value={formattedAmounts[Field.OUTPUT]}
                onUserInput={handleTypeOutput}
                label={independentField === Field.INPUT && !showWrap ? <Trans>To (at least)</Trans> : <Trans>To</Trans>}
                showMaxButton={false}
                hideBalance={false}
                fiatValue={fiatValueOutput ?? undefined}
                priceImpact={priceImpact}
                currency={currencies[Field.OUTPUT]}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                showCommonBases={true}
                id="swap-currency-output"
              />
        </div>
        </AutoColumn>
        </Wrapper>
      </AppBody>
    </>
  )
}

export default Blend
