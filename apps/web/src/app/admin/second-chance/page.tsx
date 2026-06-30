import type { Metadata } from 'next';
import { AdminSecondChancePanel } from '../../../components/admin-second-chance-panel';

export const metadata: Metadata = {
  title: 'Admin Second Chance',
};

export default function AdminSecondChancePage() {
  return <AdminSecondChancePanel />;
}
