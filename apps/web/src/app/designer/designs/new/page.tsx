import type { Metadata } from 'next';
import { DesignerNewDesignForm } from '../../../../components/designer-new-design-form';

export const metadata: Metadata = {
  title: 'New designer design',
};

export default function DesignerNewDesignPage() {
  return <DesignerNewDesignForm />;
}
