import type { Metadata } from 'next';
import { AdminPayoutsPanel } from '../../../components/admin-payouts-panel';

export const metadata: Metadata = {
  title: 'Admin payouts',
};

export default function AdminPayoutsPage() {
  return <AdminPayoutsPanel />;
}
