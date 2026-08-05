import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Atom Q",
  description: "Knowledge testing portal powered by Atom Labs",

  openGraph: {
    title: "Atom Q",
    description: "Knowledge testing portal powered by Atom Labs",
    url: "https://atom-q.atomapps.space/",
    siteName: "Atom Q",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atom Q",
    description: "Knowledge testing portal powered by Atom Labs",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
