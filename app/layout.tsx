import { env } from 'cloudflare:workers';
import { readyKey } from '@/lib/storage/assets';
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import './lobby.css';
const nunito = Nunito({
  variable: '--font-game',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});
export const metadata: Metadata = {
  title: 'Our Block — Pick your kaki',
  description:
    'A little Singapore, a lot of party chaos. Pick a local pixel pal and play Lunch Rush with your friends.',
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storage = env as unknown as {
    WORLD_ASSETS?: R2Bucket;
    ASSET_UPLOAD_TOKEN?: string;
  };
  if (
    storage.ASSET_UPLOAD_TOKEN &&
    !(await storage.WORLD_ASSETS?.head(readyKey))
  ) {
    return (
      <html lang="en">
        <head>
          <meta httpEquiv="refresh" content="5" />
        </head>
        <body className={nunito.variable}>
          <main
            style={{
              minHeight: '100dvh',
              display: 'grid',
              placeContent: 'center',
              textAlign: 'center',
            }}
          >
            <h1>Our Block</h1>
            <p>Opening the neighbourhood…</p>
          </main>
        </body>
      </html>
    );
  }
  return (
    <html lang="en">
      <body className={nunito.variable}>{children}</body>
    </html>
  );
}
