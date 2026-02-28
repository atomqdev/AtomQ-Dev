"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

import { useTheme } from "next-themes"
import { SideNav } from "@/components/web/side-nav"
import { HeroSection } from "@/components/web/hero-section"
import { SignalsSection } from "@/components/web/signals-section"
import { WorkSection } from "@/components/web/work-section"
import { PrinciplesSection } from "@/components/web/principles-section"
import { PricingSection } from "@/components/web/pricing-section"
import { ColophonSection } from "@/components/web/colophon-section"
import WebLayout from "@/components/layout/web-layout"

export default function LandingPage() {



  return (
    <WebLayout>
      <main className="relative min-h-screen">
        <SideNav />
        <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
        <div className="relative z-10">
          <HeroSection />
          <SignalsSection />
          <WorkSection />
          <PrinciplesSection />
          <PricingSection />
          <ColophonSection />
        </div>
      </main>
    </WebLayout>
  )
}
