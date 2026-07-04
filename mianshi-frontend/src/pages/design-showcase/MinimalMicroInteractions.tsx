import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, ChevronDown } from "lucide-react";

const features = [
  { title: "Clean Layout", desc: "Minimal design with maximum whitespace for focused content consumption." },
  { title: "Smart Transitions", desc: "Subtle micro-interactions that guide the user without distraction." },
  { title: "Visual Hierarchy", desc: "Every element placed with purpose to lead the eye naturally." },
  { title: "Color Minimalism", desc: "Restrained palette that puts the content front and center." },
  { title: "Typography Focus", desc: "Type-driven design where text is the primary visual element." },
  { title: "Effortless UX", desc: "Interactions that feel natural, responsive, and invisible." },
];

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function MinimalMicroInteractions() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 shadow-sm backdrop-blur-md" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-wide text-text">MINIMAL</span>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="#" className="transition-colors hover:text-text">Features</a>
            <a href="#" className="transition-colors hover:text-text">Pricing</a>
            <a href="#" className="transition-colors hover:text-text">About</a>
            <button className="rounded-full bg-text px-5 py-2 text-sm text-white transition-all hover:opacity-90 active:scale-95">Get Started</button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <FadeInSection>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex animate-pulse items-center gap-2 rounded-full border border-border-light bg-bg-subtle px-4 py-1.5 text-sm text-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand-dark" />
              Now in public beta
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-text sm:text-6xl">
              Design that{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">disappears</span>
                <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-gray-800 to-gray-300" />
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Where every pixel serves a purpose. A thoughtfully crafted experience that lets your work speak for itself.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button className="group flex items-center gap-2 rounded-xl bg-text px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97]">
                Explore Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button className="group flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-medium text-text transition-all hover:border-border/60 hover:bg-bg-subtle active:scale-[0.97]">
                Learn More
              </button>
            </div>
          </div>
        </FadeInSection>

        <div className="mt-28 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FadeInSection key={f.title} delay={i * 100}>
              <div className="group cursor-pointer rounded-2xl border border-border-light bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:shadow-card-hover">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle text-sm font-bold text-text transition-all group-hover:bg-text group-hover:text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text">{f.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{f.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={200}>
          <div className="mt-28 rounded-3xl bg-bg-subtle border border-border-light p-12 text-center sm:p-16">
            <h2 className="text-3xl font-bold text-text">Ready to simplify?</h2>
            <p className="mx-auto mt-3 max-w-md text-text-secondary">
              Join thousands of teams who have embraced minimal, intentional design.
            </p>
            <button className="mt-8 inline-flex items-center gap-2 rounded-xl bg-text px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.97]">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted">
              <ChevronDown className="h-4 w-4 animate-bounce" />
              <span>No credit card required</span>
            </div>
          </div>
        </FadeInSection>
      </div>
    </div>
  );
}
