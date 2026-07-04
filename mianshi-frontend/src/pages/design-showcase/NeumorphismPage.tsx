import { useState } from "react";
import { Sun, Moon, Volume2, Settings, Activity, Heart } from "lucide-react";

const features = [
  { icon: Sun, title: "Soft Shadows", desc: "Dual shadow technique creates raised, tactile elements." },
  { icon: Moon, title: "Dark Mode Ready", desc: "Subtle invertible palette for low-light environments." },
  { icon: Volume2, title: "Quiet Aesthetic", desc: "No harsh lines—everything blends softly." },
  { icon: Settings, title: "Extruded Controls", desc: "Buttons and cards feel physically pressable." },
  { icon: Activity, title: "Subtle Motion", desc: "Micro-interactions that respect the soft visual language." },
  { icon: Heart, title: "Timeless Appeal", desc: "A classic skeuomorphic approach made modern." },
];

const neumorphicShadow = "shadow-[6px_6px_12px_#b8bcc8,_-6px_-6px_12px_#ffffff]";
const neumorphicInset = "shadow-[inset_4px_4px_8px_#b8bcc8,_inset_-4px_-4px_8px_#ffffff]";
const neumorphicPressed = "shadow-[inset_2px_2px_5px_#b8bcc8,_inset_-2px_-2px_5px_#ffffff]";

function NeumorphicToggle() {
  const [on, setOn] = useState(false);

  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-8 w-14 rounded-full transition-all duration-300 ${on ? "bg-[#d4d9e4] " + neumorphicInset : "bg-[#e0e5ec] " + neumorphicShadow}`}
    >
      <div
        className={`absolute top-1 h-6 w-6 rounded-full bg-[#e0e5ec] transition-all duration-300 ${on ? "left-7 " + neumorphicInset : "left-1 " + neumorphicShadow}`}
      />
    </button>
  );
}

export default function NeumorphismPage() {
  const [progress, setProgress] = useState(65);

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-[#4a4d55]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-wider text-[#4a4d55]" style={{ textShadow: "2px 2px 4px #b8bcc8, -2px -2px 4px #ffffff" }}>
          NEUMORPH
        </span>
        <div className="flex items-center gap-3">
          {["Library", "Components", "Playground"].map((item) => (
            <a key={item} href="#" className={"rounded-xl bg-[#e0e5ec] px-4 py-2 text-sm transition-all duration-200 active:" + neumorphicPressed + " " + neumorphicShadow + " hover:scale-[1.02]"}>
              {item}
            </a>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pt-12 pb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl" style={{ textShadow: "3px 3px 6px #b8bcc8, -3px -3px 6px #ffffff" }}>
          Soft. Tactile. Neumorphic.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#6a6e7a]" style={{ textShadow: "1px 1px 2px #ffffff" }}>
          A design language that feels physical. Raised surfaces, pressed states, and soft shadows that bring UI to life.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className={"rounded-2xl bg-[#e0e5ec] px-8 py-3.5 text-sm font-semibold tracking-wide transition-all duration-150 active:" + neumorphicPressed + " " + neumorphicShadow + " hover:scale-[1.02]"}>
            Explore Components
          </button>
          <button className={"rounded-2xl bg-[#e0e5ec] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#6a6e7a] transition-all duration-150 active:" + neumorphicPressed + " " + neumorphicShadow + " hover:scale-[1.02]"}>
            Documentation
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={"rounded-3xl bg-[#e0e5ec] p-7 transition-all duration-200 hover:scale-[1.02] " + neumorphicShadow}>
                <div className={"mb-4 inline-flex rounded-2xl bg-[#e0e5ec] p-3.5 " + neumorphicInset}>
                  <Icon className="h-5 w-5 text-[#4a4d55]" />
                </div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#6a6e7a]">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className={"rounded-3xl bg-[#e0e5ec] p-10 " + neumorphicShadow}>
          <h2 className="mb-8 text-center text-xl font-semibold">Interactive Demo</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <span className="text-sm text-[#6a6e7a]">Toggle Switch</span>
              <div className="flex items-center gap-4">
                <Moon className="h-4 w-4 text-[#6a6e7a]" />
                <NeumorphicToggle />
                <Sun className="h-4 w-4 text-[#4a4d55]" />
              </div>
            </div>
            <div className="space-y-3">
              <span className="text-sm text-[#6a6e7a]">Progress: {progress}%</span>
              <div className={"h-4 rounded-full bg-[#e0e5ec] " + neumorphicInset}>
                <div className="h-4 rounded-full bg-gradient-to-r from-[#6a6e7a] to-[#4a4d55] transition-all duration-500" style={{ width: progress + "%" }} />
              </div>
              <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-2 w-full accent-[#4a4d55]" />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {["Save", "Cancel", "Delete"].map((label) => (
              <button key={label} className={"rounded-xl bg-[#e0e5ec] px-6 py-3 text-sm font-medium transition-all duration-150 active:" + neumorphicPressed + " " + neumorphicShadow + " hover:scale-[1.02]"}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
