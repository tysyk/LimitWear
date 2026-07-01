import type { Metadata } from 'next';
import { DesignerAnalyticsPanel } from '../../../components/designer-analytics-panel';

export const metadata: Metadata = {
  title: 'Designer analytics',
};

export default function DesignerAnalyticsPage() {
  return <DesignerAnalyticsPanel />;
}
