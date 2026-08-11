import { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
export const metadata: Metadata = {
  title: "Atom Q",
  description: "Knowledge testing portal powered by Atom Labs",

  openGraph: {
    title: "Atom Q",
    description: "Knowledge testing portal powered by Atom Labs",
    url: "https://atom-q.dev/",
    siteName: "Atom Q",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atom Q",
    description: "Knowledge testing portal powered by Atom Labs",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
