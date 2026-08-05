"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Check, ArrowRight } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const pricingPlans = [
  {
    name: "Solo Prep",
    description: "Ideal for small to mid-sized training companies and bootcamps",
    price: "$49",
    period: "per year",
    features: [
      "For individual practitioners",
      "foundation level cloud certifications",
      "Unlimited practice tests",
      "Exam simulation mode",
      "Email support",
    ],
    highlighted: false,
    cta: "Start Trial",
  },
  {
    name: "Educational Institutions",
    description: "For universities and large educational institutions",
    price: "$599",
    period: "per month",
    features: [
      "Up to 5,000 learners",
      "All certification tracks",
      "Custom question banks",
      "Skill gap analysis",
      "LMS integration",
      "Mobile app access",
      "Dedicated support",
    ],
    highlighted: true,
    cta: "Request Demo",
  },
  {
    name: "Corporates Programs",
    description: "For large-scale corporate training and enterprises",
    price: "Custom",
    period: "enterprise",
    features: [
      "All features from Institutions plan",
      "Unlimited users",
      "Custom certifications",
      "API & webhooks",
      "Dedicated account team",
      "24/7 phone support",
      "SLA guarantee",
      "On-premise option",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
]

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const handleCardHover = (index: number) => {
    setHoveredCard(index)
  }

  const handleCardLeave = () => {
    setHoveredCard(null)
  }

  const isHovered = (index: number) => hoveredCard === index

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative py-32 pl-6 md:pl-28 pr-6 md:pr-12"
    >
      {/* Section header */}
      <div ref={headerRef} className="mb-16 max-w-4xl">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          04 / Pricing
        </span>
        <h2 className="mt-4 font-[var(--font-bebas)] text-5xl md:text-7xl tracking-tight">
          ENTERPRISE PRICING
        </h2>
        <p className="mt-6 font-mono text-sm text-muted-foreground max-w-xl leading-relaxed">
          Scale your certification training programs. Plans designed for training centers, corporations, and educational institutions.
        </p>
      </div>

      {/* Pricing cards */}
      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan, index) => (
          <PricingCard
            key={index}
            plan={plan}
            index={index}
            isHovered={isHovered(index)}
            onMouseEnter={() => handleCardHover(index)}
            onMouseLeave={handleCardLeave}
          />
        ))}
      </div>

      {/* Bottom note */}
      <div className="mt-16 pt-8 border-t border-border/40">
        <p className="font-mono text-xs text-muted-foreground text-center leading-relaxed">
          All plans include full access to all certification tracks. 14-day free trial for new customers.
          <br />
          Need a custom solution for your organization?{" "}
          <a href="mailto:enterprise@atomq.com" className="text-accent hover:underline">
            Contact our enterprise sales team
          </a>
        </p>
      </div>
    </section>
  )
}

function PricingCard({
  plan,
  index,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  plan: {
    name: string
    description: string
    price: string
    period: string
    features: string[]
    highlighted: boolean
    cta: string
  }
  index: number
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative border border-border/40 p-8 flex flex-col transition-all duration-500",
        plan.highlighted && "border-accent/60",
        !plan.highlighted && isHovered && "border-accent/30",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Background layer */}
      <div
        className={cn(
          "absolute inset-0 bg-accent/5 transition-opacity duration-500",
          isHovered ? "opacity-100" : "opacity-0",
          plan.highlighted && "bg-accent/10",
        )}
      />

      {/* Popular badge for highlighted card */}
      {plan.highlighted && (
        <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 font-mono text-[10px] uppercase tracking-wider">
          Popular
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Plan name */}
        <div className="mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block">
            Plan {String(index + 1).padStart(2, "0")}
          </span>
          <h3
            className={cn(
              "font-[var(--font-bebas)] text-3xl md:text-4xl tracking-tight transition-colors duration-300",
              isHovered ? "text-accent" : "text-foreground",
            )}
          >
            {plan.name}
          </h3>
          <p className="mt-3 font-mono text-xs text-muted-foreground leading-relaxed">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <span
            className={cn(
              "font-[var(--font-bebas)] text-6xl md:text-7xl tracking-tight transition-colors duration-300",
              isHovered ? "text-accent" : "text-foreground",
            )}
          >
            {plan.price}
          </span>
          <span className="font-mono text-sm text-muted-foreground ml-2">
            {plan.period}
          </span>
        </div>

        {/* Features list */}
        <div className="flex-1 mb-8">
          <div className="h-px bg-border/40 mb-6" />
          <ul className="space-y-4">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-3">
                <Check
                  className={cn(
                    "w-4 h-4 mt-0.5 flex-shrink-0 transition-colors duration-300",
                    isHovered || plan.highlighted ? "text-accent" : "text-muted-foreground",
                  )}
                />
                <span className="font-mono text-sm text-muted-foreground leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          className={cn(
            "relative w-full py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-300 border group-hover:border-accent",
            plan.highlighted
              ? "bg-accent text-accent-foreground border-accent"
              : "bg-transparent text-foreground border-border",
            )}
        >
          <span className="flex items-center justify-center gap-2">
            {plan.cta}
            <ArrowRight
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                isHovered && "translate-x-1",
              )}
            />
          </span>
        </button>
      </div>

      {/* Corner line for highlighted cards */}
      {plan.highlighted && (
        <div
          className={cn(
            "absolute top-0 right-0 w-12 h-12 transition-all duration-500",
            isHovered ? "opacity-100" : "opacity-50",
          )}
        >
          <div className="absolute top-0 right-0 w-full h-[1px] bg-accent" />
          <div className="absolute top-0 right-0 w-[1px] h-full bg-accent" />
        </div>
      )}

      {/* Index marker */}
      <span
        className={cn(
          "absolute bottom-4 right-4 font-mono text-[10px] transition-colors duration-300",
          isHovered ? "text-accent" : "text-muted-foreground/40",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  )
}
