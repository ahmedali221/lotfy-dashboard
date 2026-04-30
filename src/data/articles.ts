export interface Article {
  id: string;
  title: { ar: string; en: string };
  excerpt: { ar: string; en: string };
  image: string;
  category: string;
  date: string;
  author: { ar: string; en: string };
  status: 'published' | 'draft';
}

export const articles: Article[] = [
  { id: '1', title: { ar: 'كيفية اختيار النظارة المناسبة لشكل وجهك', en: 'How to Choose the Right Glasses for Your Face Shape' }, excerpt: { ar: 'دليلك الشامل لاختيار إطار النظارة', en: 'Your complete guide to choosing the right frame' }, image: 'https://images.unsplash.com/photo-1761864293845-90f7ff41739b?w=800&h=600&fit=crop', category: 'tips', date: '2024-02-10', author: { ar: 'د. أحمد لطفي', en: 'Dr. Ahmed Lotfy' }, status: 'published' },
  { id: '2', title: { ar: 'أعراض إجهاد العين الرقمية وكيفية الوقاية منها', en: 'Digital Eye Strain Symptoms and Prevention' }, excerpt: { ar: 'تعرف على أعراض إجهاد العين الناتج عن الشاشات', en: 'Learn about digital eye strain symptoms' }, image: 'https://images.unsplash.com/photo-1663151064065-cb334788f77d?w=800&h=600&fit=crop', category: 'health', date: '2024-02-08', author: { ar: 'د. سارة محمد', en: 'Dr. Sara Mohamed' }, status: 'published' },
  { id: '3', title: { ar: 'دليل العناية بنظاراتك', en: 'Eyewear Care Guide' }, excerpt: { ar: 'نصائح عملية للعناية بنظاراتك', en: 'Practical tips for caring for your glasses' }, image: 'https://images.unsplash.com/photo-1769414259128-bf8a66a41701?w=800&h=600&fit=crop', category: 'tips', date: '2024-02-05', author: { ar: 'فريق لطفي للبصريات', en: 'LOTFY OPTICAL Team' }, status: 'published' },
  { id: '4', title: { ar: 'أحدث صيحات النظارات لعام 2026', en: 'Latest Eyewear Trends for 2026' }, excerpt: { ar: 'تعرف على أحدث موضة النظارات', en: 'Discover the latest eyewear fashion' }, image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&h=600&fit=crop', category: 'fashion', date: '2024-03-01', author: { ar: 'فريق لطفي للبصريات', en: 'LOTFY OPTICAL Team' }, status: 'draft' },
];
