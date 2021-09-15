import { createReducer } from '@reduxjs/toolkit'
import {
  addInput,
  Field,
  removeInput,
  replaceSwapState,
  selectCurrency,
  setRecipient,
  switchCurrencies,
  typeInput,
} from './actions'

export interface BlendInput {
  readonly currencyId: string | undefined | null
}

export interface BlendState {
  readonly independentField: Field
  readonly numberOfInput: number
  readonly typedValues: string[]
  readonly [Field.INPUT]: BlendInput[]
  readonly [Field.OUTPUT]: {
    readonly currencyId: string | undefined | null
  }
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

const initialState: BlendState = {
  independentField: Field.INPUT,
  numberOfInput: 1,
  typedValues: [''],
  [Field.INPUT]: [
    {
      currencyId: null,
    },
  ],
  [Field.OUTPUT]: {
    currencyId: null,
  },
  recipient: null,
}

export default createReducer<BlendState>(initialState, (builder) =>
  builder
    .addCase(selectCurrency, (state, { payload: { currencyId, field, indexOfInput } }) => {
      //   const otherField = field === Field.INPUT ? Field.OUTPUT : Field.INPUT
      //   if (currencyId === state[otherField].currencyId) {
      //     // the case where we have to swap the order
      //     return {
      //       ...state,
      //       independentField: state.independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT,
      //       [field]: { currencyId },
      //       [otherField]: { currencyId: state[field].currencyId },
      //     }
      //   } else {
      // the normal case
      if (field === Field.OUTPUT) {
        return {
          ...state,
          [field]: { currencyId },
        }
      } else {
        if (indexOfInput === undefined || indexOfInput >= state.numberOfInput) {
          console.log('No Input found of Index - ' + indexOfInput)
          return {
            ...state,
          }
        } else {
          const changedInputCurrency: BlendInput[] = state[Field.INPUT].map((item, index) => {
            if (indexOfInput === index) {
              return { currencyId }
            } else return item
          })
          return {
            ...state,
            [Field.INPUT]: changedInputCurrency,
          }
        }
      }
      // return {
      //   ...state,
      //   [field]: { currencyId },
      // }
      //   }
    })
    .addCase(typeInput, (state, { payload: { typedValue, indexOfInput } }) => {
      if (indexOfInput === undefined || indexOfInput >= state.numberOfInput) {
        console.log('No Input found of Index - ' + indexOfInput)
        return {
          ...state,
        }
      }
      const changedTypedValues = state.typedValues.map((value, index) => {
        if (indexOfInput === index) {
          return typedValue
        } else return value
      })
      return {
        ...state,
        typedValues: [...changedTypedValues],
      }
    })
    .addCase(addInput, (state) => {
      return {
        ...state,
        numberOfInput: state.numberOfInput + 1,
        typedValues: [...state.typedValues, ''],
        [Field.INPUT]: [
          ...state[Field.INPUT],
          {
            currencyId: null,
          },
        ],
      }
    })
    .addCase(removeInput, (state, { payload: { indexOfInput } }) => {
      if (indexOfInput === undefined || indexOfInput >= state.numberOfInput) {
        console.log('No Input found of Index - ' + indexOfInput)
        return {
          ...state,
        }
      }
      const typedValuesWithDeletedInput: string[] = state.typedValues.filter((item, index) => {
        return index !== indexOfInput
      })
      const inputCurrencyWithDeletedInput: BlendInput[] = state[Field.INPUT].filter((item, index) => {
        return index !== indexOfInput
      })
      return {
        ...state,
        numberOfInput: state.numberOfInput - 1,
        typedValues: typedValuesWithDeletedInput,
        [Field.INPUT]: inputCurrencyWithDeletedInput,
      }
    })
    .addCase(setRecipient, (state, { payload: { recipient } }) => {
      state.recipient = recipient
    })
)
