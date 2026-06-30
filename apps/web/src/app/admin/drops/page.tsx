import type { Metadata } from 'next';
import { AdminDropsPanel } from '../../../components/admin-drops-panel';

export const metadata: Metadata = {
  title: 'Admin drops',
};

export default function AdminDropsPage() {
  return <AdminDropsPanel />;
}
