import { Suspense } from 'react';

// Admin list pages read their filters from useSearchParams, which needs a
// Suspense boundary above it for the build.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
