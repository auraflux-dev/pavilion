import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, Heart } from 'lucide-react'

export function Hero() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28 lg:py-36"
      style={{ backgroundColor: '#085508' }}
      aria-label="Welcome banner"
    >
      {/* Subtle wave pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Stingray silhouette decorative element */}
      <div
        className="absolute right-0 bottom-0 w-96 h-96 opacity-[0.04] translate-x-1/4 translate-y-1/4"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="white">
          <path d="M100 20 C60 20, 10 60, 10 100 C10 140, 60 170, 100 170 C140 170, 190 140, 190 100 C190 60, 140 20, 100 20 Z M100 50 C130 50, 160 70, 160 100 C160 130, 130 150, 100 150 C70 150, 40 130, 40 100 C40 70, 70 50, 100 50 Z" />
          <path d="M100 150 L95 185 L100 195 L105 185 Z" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16">

          {/* LEFT COLUMN — 60% */}
          <div className="lg:w-[60%]">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#2A8B7A] animate-pulse" aria-hidden="true" />
              <span className="text-white/90 text-xs font-semibold tracking-wider uppercase">
                Ashburn, Virginia · LCPS
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance mb-6">
              Welcome to Stone Hill{' '}
              <span
                className="block sm:inline"
                style={{ color: '#a8d5a2' }}
              >
                Middle School PTO
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-10 max-w-2xl text-pretty">
              An active volunteer organization committed to enriching the academic and social
              experience for all SHMS students and families.{' '}
              <span className="font-semibold text-white">Go Stingrays!</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Button
                size="lg"
                className="text-white font-bold px-6 sm:px-8 shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#8B1A1A' }}
                asChild
              >
                <a href="#membership">
                  <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                  Join the PTO
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="font-bold px-6 sm:px-8 border-2 border-white text-white bg-transparent hover:bg-white hover:text-[#085508] transition-colors"
                asChild
              >
                <a href="#programs">
                  <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                  View Programs
                </a>
              </Button>

              <Button
                size="lg"
                className="text-white font-bold px-6 sm:px-8 shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#2A8B7A' }}
                asChild
              >
                <a href="#volunteer">
                  <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                  Volunteer
                </a>
              </Button>
            </div>

            {/* Stats strip */}
            <div className="mt-14 flex flex-wrap gap-8 sm:gap-12">
              {[
                { value: '500+', label: 'Student Families' },
                { value: '12+', label: 'Active Programs' },
                { value: '200+', label: 'Volunteers' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN — 40% */}
          <div className="lg:w-[40%] flex flex-col gap-4">
            {/* Top image — tall portrait */}
            <div className="group w-full rounded-xl overflow-hidden shadow-lg ring-2 ring-transparent hover:ring-[#085508] transition-all duration-300">
              <Image
                src="/placeholder.svg?height=300&width=400"
                alt="SHMS students at event"
                width={400}
                height={300}
                className="w-full h-auto object-cover"
                priority
              />
            </div>

            {/* Bottom image — landscape, offset right */}
            <div
              className="group w-[90%] rounded-xl overflow-hidden shadow-lg ring-2 ring-transparent hover:ring-[#085508] transition-all duration-300"
              style={{ marginLeft: 'auto' }}
            >
              <Image
                src="/placeholder.svg?height=200&width=400"
                alt="PTO volunteers"
                width={400}
                height={200}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Bottom wave divider */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none" aria-hidden="true">
        <svg
          viewBox="0 0 1440 60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-10 sm:h-14"
        >
          <path
            d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"
            fill="#F5F0E8"
          />
        </svg>
      </div>
    </section>
  )
}
