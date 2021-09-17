import AppBody from '../AppBody'
import { ArrowWrapper, Wrapper } from '../../components/swap/styleds'
import BlendHeader from '../../components/blend/BlendHeader'
import useToggledVersion from 'hooks/useToggledVersion'
import { AutoColumn } from 'components/Column'
import { ButtonConfirmed, ButtonError, ButtonPrimary } from 'components/Button'
import { Trans } from '@lingui/macro'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { Field } from '../../state/swap/actions'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useWrapCallback, { WrapType } from 'hooks/useWrapCallback'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { CheckCircle, HelpCircle, Plus, X } from 'react-feather'
import { ThemeContext } from 'styled-components/macro'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { useBlendActionHandlers, useBlendState, useDerivedBlendInfo } from 'state/blend/hooks'
import { ApprovalState, useApproveCallbackFromBlendArr, useApproveCallbackFromTrade } from 'hooks/useApproveCallback'
import { AutoRow } from 'components/Row'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { MouseoverTooltip } from 'components/Tooltip'
import { useContract } from 'hooks/useContract'
import useBlendCallback from 'hooks/useBlendCallback'
// import { BlendInput } from 'state/blend/reducer'

const Blend = () => {
  const toggledVersion = useToggledVersion()

  const { onCurrencySelection, onChangeRecipient, addInputBox, removeInputBox, onUserInput } = useBlendActionHandlers()
  const { independentField, typedValue, recipient } = useSwapState()
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  const {
    numberOfInput,
    typedValues,
    [Field.INPUT]: inputCurrencyIds,
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
  } = useBlendState()

  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string, i: number) => {
      onUserInput(value, i)
    },
    [onUserInput]
  )

  const {
    v2Trade,
    v3TradeState: { trade: v3Trade, state: v3TradeState },
    toggledTrade: trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
  } = useDerivedSwapInfo(toggledVersion)
  
  const { relevantTokenBalances, inputCurrencyArr, outputCurrency,v2TradeArr, allowedSlippage,outputAmount
  } = useDerivedBlendInfo()
  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const [blend]=useBlendCallback(v2TradeArr,
    outputAmount)
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
  const [approvalStateArr,approve]=useApproveCallbackFromBlendArr(v2TradeArr,allowedSlippage)
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
    (inputCurrency, i) => {
      // setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency, i)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(
    (i: number) => {
      maxInputAmount && onUserInput(maxInputAmount.toExact(), i)
    },
    [maxInputAmount, onUserInput]
  )

  const handleOutputSelect = useCallback(
    (outputCurrency) => onCurrencySelection(Field.OUTPUT, outputCurrency, 0),
    [onCurrencySelection]
  )
  const theme = useContext(ThemeContext)

  // useEffect(() => {

  // },[])
  const isValid=():boolean => {
    for(let i=0;i<approvalStateArr.length;i++) {
      if(approvalStateArr[i]!==ApprovalState.APPROVED&&v2TradeArr[i])
      return false
    }
    return true
  }
  console.log(v2TradeArr)
  return (
    <>
      <AppBody>
        <BlendHeader allowedSlippage={allowedSlippage} />
        <Wrapper>
          <AutoColumn gap={'md'}>
            <div style={{ display: 'relative' }}>
              {inputCurrencyIds.map((item, i) => {
                return (
                  <>
                    <CurrencyInputPanel
                      label={
                        //   independentField === Field.OUTPUT && !showWrap ?
                        <Trans>From (at most)</Trans>
                        //   : <Trans>From</Trans>
                      }
                      key={i}
                      value={typedValues[i]}
                      showMaxButton={showMaxButton}
                      currency={inputCurrencyArr[i]}
                      onUserInput={(e) => handleTypeInput(e, i)}
                      onMax={() => handleMaxInput(i)}
                      fiatValue={fiatValueInput ?? undefined}
                      onCurrencySelect={(e) => handleInputSelect(e, i)}
                      otherCurrency={currencies[Field.OUTPUT]}
                      showCommonBases={true}
                      id="swap-currency-input"
                    />
                    { v2TradeArr[i]&&
                      <ButtonConfirmed
                      onClick={()=>{approve(i)}}
                      disabled={
                        approvalStateArr[i] !== ApprovalState.NOT_APPROVED 
                        // approvalSubmitted ||
                        // signatureState === UseERC20PermitState.SIGNED
                      }
                      width="100%"
                      altDisabledStyle={approvalStateArr[i] === ApprovalState.PENDING} // show solid button while waiting
                      confirmed={
                        approvalStateArr[i] === ApprovalState.APPROVED 
                        // || signatureState === UseERC20PermitState.SIGNED
                      }
                    >
                      <AutoRow justify="space-between" style={{ flexWrap: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <CurrencyLogo
                            currency={inputCurrencyArr[i]}
                            size={'20px'}
                            style={{ marginRight: '8px', flexShrink: 0 }}
                          />
                          {/* we need to shorten this string on mobile */}
                          {approvalStateArr[i] === ApprovalState.APPROVED 
                          // || signatureState === UseERC20PermitState.SIGNED 
                          ? (
                            <Trans>You can now trade {inputCurrencyArr[i]?.symbol}</Trans>
                          ) : (
                            <Trans>Allow the Uniswap Protocol to use your {inputCurrencyArr[i]?.symbol}</Trans>
                          )}
                        </span>
                        {approvalStateArr[i] === ApprovalState.PENDING ? (
                          <Loader stroke="white" />
                        ) : (approvalSubmitted && approvalStateArr[i] === ApprovalState.APPROVED) 
                        // ||  signatureState === UseERC20PermitState.SIGNED 
                          ? (
                          <CheckCircle size="20" color={theme.green1} />
                        ) : (
                          <MouseoverTooltip
                            text={
                              <Trans>
                                You must give the Uniswap smart contracts permission to use your{' '}
                                {currencies[Field.INPUT]?.symbol}. You only have to do this once per token.
                              </Trans>
                            }
                          >
                            <HelpCircle size="20" color={'white'} style={{ marginLeft: '8px' }} />
                          </MouseoverTooltip>
                        )}
                      </AutoRow>
                    </ButtonConfirmed>}
                    {i === inputCurrencyIds.length - 1 ? (
                      <ArrowWrapper
                        clickable
                        onClick={() => {
                          // setApprovalSubmitted(false) // reset 2 step UI for approvals
                          addInputBox()
                        }}
                      >
                        <Plus
                          size="16"
                          color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.text1 : theme.text3}
                        />
                      </ArrowWrapper>
                    ) : (
                      <ArrowWrapper
                        onClick={() => {
                          // setApprovalSubmitted(false) // reset 2 step UI for approvals
                          // onSwitchTokens()
                          removeInputBox(i)
                        }}
                        clickable
                      >
                        <X
                          size="16"
                          color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.text1 : theme.text3}
                        />
                      </ArrowWrapper>
                    )}
                  </>
                )
              })}
              <CurrencyInputPanel
                value={outputAmount?outputAmount?.toSignificant(6):""}
                onUserInput={(e: string) => {
                  console.log(e)
                }}
                label={independentField === Field.INPUT && !showWrap ? <Trans>To (at least)</Trans> : <Trans>To</Trans>}
                showMaxButton={false}
                hideBalance={false}
                fiatValue={fiatValueOutput ?? undefined}
                priceImpact={priceImpact}
                currency={outputCurrency}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                showCommonBases={true}
                disabled
                id="swap-currency-output"
              />

                    <ButtonError
                      onClick={() => {
                        // if (isExpertMode) {
                        //   handleSwap()
                        // } else {
                        //   setSwapState({
                        //     tradeToConfirm: trade,
                        //     attemptingTxn: false,
                        //     swapErrorMessage: undefined,
                        //     showConfirm: true,
                        //     txHash: undefined,
                        //   })
                        // }
                        blend()
                        console.log("...")
                      }}
                      width="100%"
                      id="swap-button"
                      // disabled={
                      //   isValid
                      //   // !isValid ||
                      //   // (approvalState !== ApprovalState.APPROVED && signatureState !== UseERC20PermitState.SIGNED)
                      //   // || priceImpactTooHigh
                      // }
                      // error={isValid && priceImpactSeverity > 2}
                      error={!isValid}
                      disabled={!isValid}
                    >
                      {/* <Text fontSize={16} fontWeight={500}>
                        {priceImpactTooHigh ? (
                          <Trans>High Price Impact</Trans>
                        ) : priceImpactSeverity > 2 ? (
                          <Trans>Swap Anyway</Trans>
                        ) : (
                          <Trans>Swap</Trans>
                        )}
                      </Text> */}
                      {isValid()?"Blend":"..."}
                    </ButtonError>
            </div>
          </AutoColumn>
        </Wrapper>
      </AppBody>
    </>
  )
}

export default Blend
