"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {
      // Header slide in
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          x: -60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      // Grid columns fade up with stagger
      if (gridRef.current) {
        const columns = gridRef.current.querySelectorAll(":scope > div")
        gsap.from(columns, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      }

      // Footer fade in
      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12 border-t border-border/30"
    >
      {/* Section header */}
      <div ref={headerRef} className="mb-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">05 / Contact</span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">GET IN TOUCH</h2>
      </div>

      {/* Multi-column layout */}
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12">
        {/* Certifications */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">AWS</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Cloud Practitioner</li>
            <li className="font-mono text-xs text-foreground/80">Solutions Architect</li>
            <li className="font-mono text-xs text-foreground/80">Developer Associate</li>
            <li className="font-mono text-xs text-foreground/80">AI Practitioner</li>
            <li className="font-mono text-xs text-foreground/80">Machine Learning</li>
          </ul>
        </div>

        {/* Cloud Platforms */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Cloud Platforms</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Microsoft Azure</li>
            <li className="font-mono text-xs text-foreground/80">Google Cloud (GCP)</li>
            <li className="font-mono text-xs text-foreground/80">Oracle Cloud (OCI)</li>
            <li className="font-mono text-xs text-foreground/80">IBM Cloud</li>
          </ul>
        </div>

        {/* Business Intelligence */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Business Intelligence</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Power BI Desktop</li>
            <li className="font-mono text-xs text-foreground/80">Power BI Service</li>
            <li className="font-mono text-xs text-foreground/80">Fabric Analytics</li>
            <li className="font-mono text-xs text-foreground/80">Tableau</li>
          </ul>
        </div>

        {/* Solutions */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Solutions</h4>
          <ul className="space-y-2">
            <li className="font-mono text-xs text-foreground/80">Training Companies</li>
            <li className="font-mono text-xs text-foreground/80">Enterprise L&D</li>
            <li className="font-mono text-xs text-foreground/80">Universities</li>
            <li className="font-mono text-xs text-foreground/80">Bootcamps</li>
          </ul>
        </div>

        {/* Resources */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Resources</h4>
          <ul className="space-y-2">
            <li>
              <a
                href="/MOBILE_API.md"
                target="_blank"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                API Documentation
              </a>
            </li>
            <li>
              <a
                href="#"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                Integration Guide
              </a>
            </li>
            <li>
              <a
                href="#"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                Case Studies
              </a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="col-span-1">
          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Enterprise Sales</h4>
          <ul className="space-y-2">
            <li>
              <a
                href="mailto:enterprise@atomq.com"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                Contact Sales
              </a>
            </li>
            <li>
              <a
                href="#"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                Request Demo
              </a>
            </li>
            <li>
              <a
                href="https://atomlabs.in"
                target="_blank"
                className="font-mono text-xs text-foreground/80 hover:text-accent transition-colors duration-200"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom copyright */}
      <div
        ref={footerRef}
        className="mt-24 pt-8 border-t border-border/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          © 2026 ATOM Q. Enterprise Certification Platform. All rights reserved.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">Enterprise solution by <a href="https://www.atomlabs.in" target="_blank" className="font-bold text-blue-600 hover:text-blue-500 hover:text-lg transition-all">Atom Labs</a></p>
      </div>
    </section>
  )
}
