export interface Product {
  id: string;
  name: { ar: string; en: string };
  price: number;
  category: string;
  brand?: string;
  rating: number;
  image: string;
  description: { ar: string; en: string };
  stock: number;
}

export const products: Product[] = [
  { id: 'sun-m-1', name: { ar: 'ريبان أفياتور ذهبي', en: 'Ray-Ban Aviator Gold' }, price: 2200, category: 'sunglasses', brand: 'Ray-Ban', rating: 4.9, image: 'https://images.unsplash.com/photo-1623998021736-282f53c4fc07?w=400&h=400&fit=crop', description: { ar: 'نظارة ريبان أفياتور بإطار ذهبي', en: 'Iconic Ray-Ban Aviator with gold frame' }, stock: 15 },
  { id: 'sun-m-2', name: { ar: 'أوكلي رياضية سوداء', en: 'Oakley Sport Black' }, price: 1800, category: 'sunglasses', brand: 'Oakley', rating: 4.8, image: 'https://images.unsplash.com/photo-1575552552354-1930eea6db22?w=400&h=400&fit=crop', description: { ar: 'نظارة أوكلي رياضية', en: 'Professional Oakley sport sunglasses' }, stock: 20 },
  { id: 'eye-m-1', name: { ar: 'غوتشي مستطيلة', en: 'Gucci Rectangular' }, price: 3500, category: 'eyeglasses', brand: 'Gucci', rating: 4.7, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&fit=crop', description: { ar: 'نظارة غوتشي الفاخرة', en: 'Luxury Gucci rectangular frame' }, stock: 8 },
  { id: 'eye-f-1', name: { ar: 'بربري نسائية وردي', en: 'Burberry Women Pink' }, price: 2800, category: 'eyeglasses', brand: 'Burberry', rating: 4.8, image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&h=400&fit=crop', description: { ar: 'إطار نسائي بربري أنيق', en: 'Elegant Burberry women frame' }, stock: 12 },
  { id: 'contact-1', name: { ar: 'عدسات لاصقة شهرية', en: 'Monthly Contact Lenses' }, price: 450, category: 'contacts', brand: 'Acuvue', rating: 4.6, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', description: { ar: 'عدسات لاصقة شهرية مريحة', en: 'Comfortable monthly contact lenses' }, stock: 50 },
  { id: 'contact-2', name: { ar: 'عدسات يومية', en: 'Daily Contact Lenses' }, price: 280, category: 'contacts', brand: 'Dailies', rating: 4.5, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', description: { ar: 'عدسات لاصقة يومية', en: 'Daily disposable contact lenses' }, stock: 100 },
  { id: 'sun-f-1', name: { ar: 'شانيل دائرية نسائية', en: 'Chanel Round Women' }, price: 4200, category: 'sunglasses', brand: 'Chanel', rating: 4.9, image: 'https://images.unsplash.com/photo-1609803384069-19f3f5d7d4b1?w=400&h=400&fit=crop', description: { ar: 'نظارة شانيل الدائرية الفاخرة', en: 'Luxurious Chanel round sunglasses' }, stock: 6 },
  { id: 'eye-k-1', name: { ar: 'نظارة أطفال ملونة', en: 'Kids Colorful Frame' }, price: 380, category: 'eyeglasses', brand: 'Junior', rating: 4.4, image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop', description: { ar: 'إطار أطفال ملون ومتين', en: 'Colorful durable kids frame' }, stock: 3 },
  { id: 'acc-1', name: { ar: 'محلول تنظيف عدسات', en: 'Lens Cleaning Solution' }, price: 85, category: 'accessories', brand: 'Optic Clean', rating: 4.3, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', description: { ar: 'محلول تنظيف عدسات فعال', en: 'Effective lens cleaning solution' }, stock: 2 },
  { id: 'eye-m-2', name: { ar: 'تيفاني وكو أزرق', en: 'Tiffany & Co Blue' }, price: 3200, category: 'eyeglasses', brand: 'Tiffany', rating: 4.7, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&fit=crop', description: { ar: 'نظارة تيفاني الأنيقة', en: 'Elegant Tiffany frame' }, stock: 4 },
];
