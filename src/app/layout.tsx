
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: 'Drop Aqua Track - Daily Sales Reporter',
  description: 'Track daily sales and reconcile cash for your water delivery business.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          geistSans.variable
        )}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
