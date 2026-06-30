import type { Metadata } from 'next';
import { WishlistPanel } from '../../../components/wishlist-panel';

export const metadata: Metadata = {
  title: 'Wishlist',
};

export default function ProfileWishlistPage() {
  return <WishlistPanel />;
}
