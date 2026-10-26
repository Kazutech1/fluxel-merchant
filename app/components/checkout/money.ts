import { formatQuote } from '../../lib/paymentSessions';
import type { AssetCode } from '../../types/dashboard';
import { getAssetSymbol } from '../common/MinorUnitFormatter';

/**
 * ₦ prefix for naira; crypto takes its ticker as a suffix — "$9.38" reads as
 * dollars, not USDT, and "Ξ"/"₿" are easy to misread on a payment page.
 */
export function checkoutMoney(amount: string, asset: AssetCode): string {
  return asset === 'NGN' ? `${getAssetSymbol(asset)}${formatQuote(amount, asset)}` : `${formatQuote(amount, asset)} ${asset}`;
}
