'use client';

import { useParams } from 'next/navigation';
import ProductFormPage from '../../_components/ProductFormPage';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductFormPage productId={Number(id)} />;
}
