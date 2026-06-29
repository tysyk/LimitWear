import type { Metadata } from 'next';
import { AdminProductionPanel } from '../../../components/admin-production-panel';

export const metadata: Metadata = {
  title: 'Admin production',
};

export default function AdminProductionPage() {
  return <AdminProductionPanel />;
}
