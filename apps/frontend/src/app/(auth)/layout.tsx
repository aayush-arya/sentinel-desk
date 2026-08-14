import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLogo />
      </Link>
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-xl shadow-black/5">
        {children}
      </div>
    </div>
  );
}
