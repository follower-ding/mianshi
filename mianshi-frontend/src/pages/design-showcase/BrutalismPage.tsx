import { useEffect, useState } from 'react'
import { Zap, Flame, ArrowRight, MessageCircle } from 'lucide-react'

const cards = [
  { title: 'BUILD FAST', desc: 'Ship features at the speed of light. No bureaucracy.', span: 'lg:col-span-2', icon: Zap },
  { title: 'BREAK RULES', desc: 'Forget the playbook. Create your own.', icon: Flame },
  { title: 'SHIP NOW', desc: 'Perfect is the enemy of shipped. Launch raw.', icon: ArrowRight },
  { title: 'CHALLENGE', desc: 'Comfort zones are where ideas go to die.', icon: MessageCircle },
  { title: 'OWN IT', desc: 'Radical ownership. No excuses. No limits.', icon: Zap },
]

export default function BrutalismPage() {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* CSS-only cursor follower */}
      <div
        className="pointer-events-none fixed z-50 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white/80 transition-transform duration-75"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />

      {/* Hero */}
      <section className="relative border-b-4 border-black bg-[#FFE600] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="-ml-2 inline-block -rotate-2 border-4 border-black bg-black px-4 py-1 text-sm font-bold uppercase tracking-widest text-white">
            Brutalism Design
          </div>
          <h1 className="mt-6 text-6xl font-bold uppercase leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
            Raw.
            <br />
            <span className="inline-block -rotate-1 border-b-8 border-black">Unfiltered.</span>
            <br />
            <span className="inline-block skew-x-[-3deg] bg-black px-4 text-[#FFE600]">Brutal.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-bold uppercase leading-relaxed">
            No fluff. No gradients. No rounded corners. Just raw, unapologetic typography and bold borders.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="group flex items-center gap-2 border-4 border-black bg-white px-8 py-4 text-sm font-bold uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="border-4 border-black bg-black px-8 py-4 text-sm font-bold uppercase text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Asymmetric Grid */}
      <section className="border-b-4 border-black px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-4xl font-bold uppercase tracking-tight">
            <span className="inline-block -rotate-2 bg-black px-3 py-1 text-white">THE GRID</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.title}
                  className={'group border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:-translate-x-1 ' + (c.span || '')}
                >
                  <Icon className="mb-4 h-8 w-8" />
                  <h3 className="mb-2 text-2xl font-bold uppercase">{c.title}</h3>
                  <p className="font-medium text-text-secondary">{c.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Rotated CTA Banner */}
      <section className="overflow-hidden border-b-4 border-black bg-black py-16">
        <div className="skew-y-[-4deg] transform bg-[#FFE600] py-8">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-4xl font-bold uppercase tracking-tight sm:text-5xl">
              <span className="inline-block -rotate-1 border-4 border-black bg-white px-4 py-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                NO EXCUSES
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg font-bold uppercase">
              Brutalism is not a trend. It&apos;s a statement.
            </p>
            <button className="mt-6 border-4 border-black bg-white px-8 py-4 text-sm font-bold uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
              Join the Movement
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm font-bold uppercase">
          <span className="border-2 border-black px-3 py-1">BRUTALISM</span>
          <span>No copyright. Just vibes.</span>
        </div>
      </footer>
    </div>
  )
}
