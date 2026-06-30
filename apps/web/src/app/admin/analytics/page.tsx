import type { Metadata } from 'next';
import { AdminAnalyticsPanel } from '../../../components/admin-analytics-panel';

export const metadata: Metadata = {
  title: 'Admin analytics',
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsPanel />;
}
