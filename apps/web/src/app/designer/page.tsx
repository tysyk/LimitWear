import type { Metadata } from 'next';
import { DesignerCabinet } from '../../components/designer-cabinet';

export const metadata: Metadata = {
  title: 'Designer cabinet',
};

export default function DesignerPage() {
  return <DesignerCabinet />;
}
