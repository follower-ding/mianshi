import { Sparkles, Star, Zap, Users } from 'lucide-react'

const features = [
  { icon: Sparkles, title: 'Frosted Panels', desc: 'Elegant translucent cards with deep backdrop blur effects.' },
  { icon: Star, title: 'Vibrancy', desc: 'Colors shine through glass with enhanced saturation and depth.' },
  { icon: Zap, title: 'Light Response', desc: 'Interactive glow that reacts to hover and focus states.' },
  { icon: Users, title: 'Layered Depth', desc: 'Multi-plane UI that creates a tangible sense of space.' },
]

const stats = [
  { value: '12K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9', label: 'Avg. Rating' },
]

export default function GlassmorphismPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-600 via-fuchsia-500 to-blue-500">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-48 w-48 rounded-full bg-blue-300/15 blur-2xl" />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-2 backdrop-blur-xl shadow-lg">
          <span className="text-sm font-bold tracking-widest text-white/90">GLASS</span>
        </div>
        <div className="flex items-center gap-3">
          {['Features', 'Pricing', 'Docs'].map((item) => (
            <a
              key={item}
              href="#"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/15 hover:text-white"
            >
              {item}
            </a>
          ))}
          <button className="rounded-xl border border-white/30 bg-white/20 px-5 py-2 text-sm font-medium text-white backdrop-blur-xl shadow-lg transition-all hover:bg-white/30 active:scale-[0.97]">
            Launch
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="mx-auto inline-block rounded-2xl border border-white/20 bg-white/10 px-5 py-2 backdrop-blur-xl shadow-lg">
          <span className="flex items-center gap-2 text-sm text-white/80">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Glassmorphism 2.0 is here
          </span>
        </div>
        <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Frosted &{' '}
          <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Translucent
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
          A modern glass aesthetic that brings depth, light, and sophistication to your interface.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button className="rounded-2xl border border-white/30 bg-white/20 px-7 py-3 text-sm font-medium text-white backdrop-blur-xl shadow-xl transition-all hover:bg-white/30 active:scale-[0.97]">
            Get Started
          </button>
          <button className="rounded-2xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white/80 backdrop-blur-lg transition-all hover:bg-white/15 hover:text-white">
            Learn More
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/15"
              >
                <div className="mb-4 inline-flex rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md shadow-lg">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-1 font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-xl shadow-2xl"
            >
              <div className="text-4xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-12 text-center backdrop-blur-xl shadow-2xl">
          <h2 className="text-3xl font-bold text-white">See through the noise</h2>
          <p className="mx-auto mt-3 max-w-md text-white/65">
            Experience the clarity of glassmorphic design for your next project.
          </p>
          <button className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/20 px-6 py-3 text-sm font-medium text-white backdrop-blur-xl shadow-lg transition-all hover:bg-white/30 active:scale-[0.97]">
            <Zap className="h-4 w-4" />
            Launch App
          </button>
        </div>
      </section>
    </div>
  )
}
