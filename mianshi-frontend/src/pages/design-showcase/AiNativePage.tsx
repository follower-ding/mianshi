import { Bot, User, Send, Plus, History, Sparkles } from "lucide-react";

const conversations = [
  { title: "React Component Design", preview: "How do I create a reusable modal...", time: "2m ago" },
  { title: "System Design: YouTube", preview: "Break down the architecture...", time: "1h ago" },
  { title: "LeetCode 424", preview: "Longest repeating character replacement...", time: "3h ago" },
  { title: "Behavioral: Leadership", preview: "Tell me about a time you resolved...", time: "1d ago" },
];

const messages = [
  { role: "ai", text: "I’m here to help you ace your interviews. Ask me anything about system design, algorithms, or behavioral questions." },
  { role: "user", text: "Can you explain how Redis works under the hood?" },
  { role: "ai", text: "Redis is an in-memory data structure store. Here’s the breakdown:\n\n• Single-threaded event loop using epoll/kqueue\n• Data persisted via RDB snapshots + AOF logs\n• Rich data types: Strings, Lists, Sets, Sorted Sets, Hashes, Bitmaps, HyperLogLog\n• Pub/Sub and Streams for messaging patterns\n• Cluster mode with hash slot partitioning (16384 slots)" },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-2 w-2 animate-bounce rounded-full bg-white/40" style={{ animationDelay: i * 0.15 + "s", animationDuration: "0.8s" }} />
      ))}
    </div>
  );
}

export default function AiNativePage() {
  return (
    <div className="flex min-h-screen bg-[#0f0f0f] text-white">
      <style>{`
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        .typewriter {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          animation: typewriter 1.5s steps(40, end) forwards;
          width: 0;
        }
      `}</style>

      <aside className="hidden w-72 flex-col border-r border-white/[0.06] bg-[#141414] p-4 sm:flex">
        <button className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white">
          <Plus className="h-4 w-4" />
          New Chat
        </button>

        <div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/30">
          <History className="h-3.5 w-3.5" />
          History
        </div>
        <div className="mt-3 space-y-1.5">
          {conversations.map((c) => (
            <button key={c.title} className="w-full rounded-xl border border-transparent bg-white/[0.03] px-3.5 py-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.06]">
              <div className="text-sm font-medium text-white/80">{c.title}</div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-white/35">
                <span className="truncate">{c.preview}</span>
                <span className="shrink-0">{c.time}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Pro Plan
          </div>
          <p className="mt-1 text-xs text-white/40">Unlimited messages, priority access, and more.</p>
          <button className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition-all hover:bg-white/90">
            Upgrade
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">AI</div>
            <div>
              <div className="text-sm font-medium">AI Interview Coach</div>
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Online
              </div>
            </div>
          </div>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white">
            Clear Chat
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
          {messages.map((m, i) => (
            <div key={i} className={"flex gap-4 " + (m.role === "user" ? "flex-row-reverse" : "")}>
              <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold " + (m.role === "ai" ? "bg-white/10 text-white" : "bg-brand text-black")}>
                {m.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={"max-w-[70%] space-y-2 " + (m.role === "user" ? "items-end" : "")}>
                <div className={"rounded-2xl px-4 py-3 text-sm leading-relaxed " + (m.role === "ai" ? "bg-white/10 text-white/90" : "bg-brand text-black")}>
                  {m.role === "ai" && i === 2 ? (
                    <span className="typewriter align-top">{m.text}</span>
                  ) : (
                    <span>{m.text}</span>
                  )}
                </div>
                <div className={"flex text-xs text-white/25 " + (m.role === "user" ? "justify-end" : "")}>
                  {m.role === "ai" ? "AI" : "You"} · just now
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Bot className="h-4 w-4 text-white/60" />
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <TypingDots />
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-white/20 focus-within:bg-white/[0.04]">
            <input type="text" placeholder="Ask anything..." className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-black transition-all hover:bg-brand-dark active:scale-95">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-white/15">
            AI may produce inaccurate information. Verify important facts.
          </p>
        </div>
      </div>
    </div>
  );
}
