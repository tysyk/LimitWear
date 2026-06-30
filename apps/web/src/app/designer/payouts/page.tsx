import type { Metadata } from 'next';
import { DesignerPayoutsPanel } from '../../../components/designer-payouts-panel';

export const metadata: Metadata = {
  title: 'Designer payouts',
};

export default function DesignerPayoutsPage() {
  return <DesignerPayoutsPanel />;
}
