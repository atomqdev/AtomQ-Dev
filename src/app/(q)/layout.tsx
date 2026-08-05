import { Metadata } from "next"
import "./globals.css"
import ClientLayout from "@/components/layout/client-layout"

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

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const savedTheme = localStorage.getItem('theme');
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              
              let resolvedTheme = systemTheme;
              
              if (savedTheme === 'light' || savedTheme === 'dark') {
                resolvedTheme = savedTheme;
              }
              // If savedTheme is 'system' or not set, use system preference
              
              if (resolvedTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
              }
            } catch (e) {
              console.error('Theme initialization failed:', e);
            }
          })();
        `,
      }}
    />
  )
}

export default function QLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeScript />
      <ClientLayout>{children}</ClientLayout>
    </>
  )
}