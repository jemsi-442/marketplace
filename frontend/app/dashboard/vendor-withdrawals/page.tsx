'use client';

import { VendorWithdrawalsPageScreen } from './_components/vendor-withdrawals-page-screen';
import { useVendorWithdrawals } from './use-vendor-withdrawals';

export default function VendorWithdrawalsPage() {
  const workspace = useVendorWithdrawals();

  return <VendorWithdrawalsPageScreen workspace={workspace} />;
}
