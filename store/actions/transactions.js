/**
 * Copyright (c) 2019 CYBAVO, Inc.
 * https://www.cybavo.com
 *
 * All rights reserved.
 */
import { Wallets } from '@cybavo/react-native-wallet-service';
import { fetchBalance } from './balance';
import { getWalletKey } from '../../Helpers';

export const TRANSACTIONS_ENQUEUE = 'TRANSACTIONS_ENQUEUE';
export const TRANSACTIONS_UPDATE_TRANSACTIONS =
  'TRANSACTIONS_UPDATE_TRANSACTIONS';

const TRANSACTION_THROTTLE = 10 * 1000; // 10 sec
const TRANSACTION_ENQUEUE_DELAY = 500; // 3 sec
export const NOT_LOADING = 0;
export const GET_NEW = 1;
export const GET_MORE = 2;
function shouldFetchTransactions(currency, tokenAddress, address, state) {
  const key = getWalletKey(currency, tokenAddress, address);
  if (
    state.transactions.transactions == null ||
    state.transactions.transactions[key] == null ||
    state.transactions.transactions[key].data == null
  ) {
    return true;
  }

  const transactions = state.transactions.transactions[key].data;
  if (!transactions) {
    // not exist
    return true;
  }
  if (transactions.loading != NOT_LOADING) {
    // already loading
    return false;
  }

  if (!transactions.updatedAt) {
    // no time for some how
    return true;
  }
  // expired
  return Date.now() - transactions.updatedAt > TRANSACTION_THROTTLE;
}

export function fetchTransaction(
  currency,
  tokenAddress,
  address,
  currencySymbol,
  isFungible,
  refresh,
  start = 0,
  filters = {
    direction: null,
    pending: null,
    success: null,
  }
) {
  return async (dispatch, getState) => {
    if (
      refresh ||
      shouldFetchTransactions(currency, tokenAddress, address, getState())
    ) {
      dispatch({
        type: TRANSACTIONS_ENQUEUE,
        currency,
        tokenAddress,
        address,
        loading: start == 0 ? GET_NEW : GET_MORE,
      });
      try {
        const count = 10;
        const result = await Wallets.getHistory(
          currency,
          tokenAddress,
          address,
          start,
          count,
          filters
        );
        dispatch({
          type: TRANSACTIONS_UPDATE_TRANSACTIONS,
          transactions: result.transactions,
          total: result.total,
          start: start,
          currency,
          tokenAddress,
          address,
          currencySymbol: isFungible ? '' : currencySymbol,
        });
      } catch (error) {
        console.log('fetchTransactionsBatch failed', error);
        dispatch({
          type: TRANSACTIONS_ENQUEUE,
          currency,
          tokenAddress,
          address,
          loading: false,
        });
      }
    }
  };
}