export function CommunityBanner() {
  return (
    <section className="relative w-full h-48 sm:h-64 md:h-72 overflow-hidden" aria-label="Community photo">
      <img
        src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1440&h=400&fit=crop&crop=center"
        alt="Stone Hill Middle School PTO community"
        className="w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center px-4 drop-shadow-lg">
          Building community together — Go Stingrays! 🐟
        </p>
      </div>
    </section>
  )
}
