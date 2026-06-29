import type { Metadata } from 'next';
import { AdminTtnForm } from '../../../components/admin-ttn-form';

export const metadata: Metadata = {
  title: 'Admin delivery',
};

export default function AdminDeliveryPage() {
  return <AdminTtnForm />;
}
