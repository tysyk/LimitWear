import type { Metadata } from 'next';
import { DesignerDesignsPanel } from '../../../components/designer-designs-panel';

export const metadata: Metadata = {
  title: 'Designer designs',
};

export default function DesignerDesignsPage() {
  return <DesignerDesignsPanel />;
}
