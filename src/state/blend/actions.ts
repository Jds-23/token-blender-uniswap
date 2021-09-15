import { createAction } from '@reduxjs/toolkit'

export enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export const selectCurrency = createAction<{ field: Field; currencyId: string; indexOfInput: number| undefined}>('blend/selectCurrency')
export const typeInput = createAction<{  typedValue: string; indexOfInput: number| undefined}>('blend/typeInput')
export const addInput = createAction('blend/addInput')
export const removeInput = createAction<{indexOfInput: number}>('blend/removeInput')

export const switchCurrencies = createAction<void>('swap/switchCurrencies')
export const replaceSwapState =
  createAction<{
    field: Field
    typedValue: string
    inputCurrencyId?: string
    outputCurrencyId?: string
    recipient: string | null
  }>('swap/replaceSwapState')
export const setRecipient = createAction<{ recipient: string | null }>('swap/setRecipient')
