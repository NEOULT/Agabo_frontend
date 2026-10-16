import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Currency } from '@/domain/models';
import { formatCurrency } from '@/shared/utils/format';
import { BASE_CURRENCY_FORMAT, convertFromBase, type CurrencyFormat } from '@/shared/config/currency';
import type { PaymentInCurrencyView } from './pos.types';

/** Redondeo al céntimo de una moneda (2 decimales, como el backend). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Monedas del punto de venta.
 *
 * Separa dos cosas que el POS necesita por motivos distintos:
 * - **Visualización**: en qué moneda se pintan los precios y el total.
 * - **Cobro**: en qué moneda paga el cliente. Los precios y la venta siempre
 *   viajan en la moneda base, así que aquí solo se convierte para mostrar y para
 *   enviar el importe entregado.
 */
export function usePosCurrency(currencies: Currency[]) {
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState('');
  const [paymentCurrencyId, setPaymentCurrencyId] = useState('');

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.is_active),
    [currencies],
  );

  const baseCurrency = activeCurrencies.find((currency) => currency.is_base) ?? activeCurrencies[0];
  const selectedCurrency =
    activeCurrencies.find((currency) => currency.code === displayCurrencyCode) ?? baseCurrency;
  const baseFormat: CurrencyFormat = baseCurrency
    ? { symbol: baseCurrency.symbol, fractionDigits: baseCurrency.decimals }
    : BASE_CURRENCY_FORMAT;
  const isBaseDisplay = !selectedCurrency || selectedCurrency.is_base;

  // Moneda del cobro: la elegida por el cajero o, por defecto, la base.
  const paymentCurrency =
    activeCurrencies.find((currency) => currency.id === paymentCurrencyId) ?? baseCurrency;
  const isPaymentInBase = !paymentCurrency || paymentCurrency.is_base;

  // Selecciona la moneda base cuando llega del backend.
  useEffect(() => {
    if (!displayCurrencyCode && baseCurrency) setDisplayCurrencyCode(baseCurrency.code);
  }, [baseCurrency, displayCurrencyCode]);

  /** Pinta un importe (dado en moneda base) en la moneda indicada. */
  const formatInCurrency = useCallback(
    (valueInBase: number, currency: Currency) =>
      formatCurrency(convertFromBase(valueInBase, currency.exchange_rate), {
        symbol: currency.symbol,
        fractionDigits: currency.decimals,
      }),
    [],
  );

  // Los importes se muestran en la moneda elegida (símbolo, decimales y tasa del
  // backend), pero la venta y el pago siempre viajan en la moneda base.
  const money = useCallback(
    (valueInBase: number) => {
      if (!selectedCurrency) return formatCurrency(valueInBase, BASE_CURRENCY_FORMAT);
      return formatInCurrency(valueInBase, selectedCurrency);
    },
    [formatInCurrency, selectedCurrency],
  );

  /**
   * Importe que entrega el cliente en la moneda del cobro, redondeado al céntimo
   * de esa moneda. `undefined` cuando el cobro va en la moneda base.
   */
  const toPaymentCurrencyAmount = useCallback(
    (baseAmount: number): number | undefined => {
      if (!paymentCurrency || paymentCurrency.is_base || baseAmount <= 0) return undefined;
      return round2(convertFromBase(baseAmount, paymentCurrency.exchange_rate));
    },
    [paymentCurrency],
  );

  /** Resumen del cobro en la moneda del cliente, para la confirmación. */
  const toPaymentInCurrencyView = useCallback(
    (baseAmount: number): PaymentInCurrencyView | null => {
      if (!paymentCurrency || paymentCurrency.is_base) return null;
      if (baseAmount <= 0 || Number.isNaN(baseAmount)) return null;

      return {
        code: paymentCurrency.code,
        amountLabel: formatInCurrency(baseAmount, paymentCurrency),
        rateLabel: String(paymentCurrency.exchange_rate),
        baseSymbol: baseFormat.symbol,
      };
    },
    [baseFormat.symbol, formatInCurrency, paymentCurrency],
  );

  return {
    activeCurrencies,
    baseCurrency,
    baseFormat,
    displayCurrencyCode,
    setDisplayCurrencyCode,
    selectedCurrency,
    isBaseDisplay,
    paymentCurrencyId,
    setPaymentCurrencyId,
    paymentCurrency,
    isPaymentInBase,
    money,
    formatInCurrency,
    toPaymentCurrencyAmount,
    toPaymentInCurrencyView,
  };
}
