import type React from "react"
import { IBM_Plex_Sans, IBM_Plex_Mono, Bebas_Neue } from "next/font/google"
import { SmoothScroll } from "@/components/web/smooth-scroll"
import "@/app/web.css"

const ibmPlexSans = IBM_Plex_Sans({
    weight: ["400", "500", "600", "700"],
    subsets: ["latin"],
    variable: "--font-ibm-plex-sans",
})
const ibmPlexMono = IBM_Plex_Mono({
    weight: ["400", "500"],
    subsets: ["latin"],
    variable: "--font-ibm-plex-mono",
})
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" })



export default function WebLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (

        <div className="dark bg-background">
            <div className={`${ibmPlexSans.variable} ${bebasNeue.variable} ${ibmPlexMono.variable} font-sans antialiased overflow-x-hidden`}>
                <div className="noise-overlay" aria-hidden="true" />
                <SmoothScroll>{children}</SmoothScroll>
            </div>
        </div>
    )
}
