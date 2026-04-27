 "use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

type Country = {
  name: { common: string };
  region: string;
  capital?: string[];
  flags: { png: string };
  cca2: string;
};

type State = "idle" | "typing" | "loading" | "success" | "empty" | "error";

export default function Page() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Country[]>([]);
  const [state, setState] = useState<State>("idle");

  // ✅ SPLASH STATE (added only)
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Country[]>>(new Map());

  const fetchCountries = async (search: string) => {
    if (cacheRef.current.has(search)) {
      setResults(cacheRef.current.get(search)!);
      setState("success");
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setState("loading");

      const res = await fetch(
        `https://restcountries.com/v3.1/name/${search}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        setState("empty");
        return;
      }

      const data: Country[] = await res.json();

      const q = search.toLowerCase();

      const ranked = data
        .map((c) => {
          const name = c.name.common.toLowerCase();

          let score = 0;

          if (name === q) score += 100;
          if (name.startsWith(q)) score += 70;
          if (name.includes(q)) score += 40;
          if (name.replace(/\s/g, "").includes(q)) score += 20;

          return { c, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.c)
        .slice(0, 5);

      cacheRef.current.set(search, ranked);

      setResults(ranked);
      setState(ranked.length ? "success" : "empty");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name !== "AbortError") setState("error");
      } else {
        setState("error");
      }
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);

    if (value.length < 3) {
      setState("idle");
      setResults([]);
      return;
    }

    setState("typing");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchCountries(value);
    }, 150);
  };

  // ✅ SPLASH SCREEN (added only, nothing else changed)
  if (booting) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden">
        <div className="text-white text-5xl tracking-[0.5em] font-bold animate-pulse">
          Country Lens
        </div>

        <div className="absolute w-60 h-60 bg-indigo-500 blur-3xl opacity-40 rounded-full animate-ping" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-start justify-center pt-28 px-4">
      {/* GLASS CONTAINER */}
      <div className="w-full max-w-2xl">
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-4 transition-all duration-300">
          {/* INPUT */}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search countries..."
              className="w-full pl-12 pr-20 py-4 rounded-2xl bg-white/10 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all duration-300 focus:scale-[1.01]"
            />

            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              🔍
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 bg-white/10 px-2 py-1 rounded-md border border-white/10">
              ⌘K
            </div>

            {state === "loading" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 overflow-hidden rounded-b-2xl">
                <div className="h-full w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* DROPDOWN */}
          {query.length >= 3 && (
            <div className="mt-4 space-y-2">
              {state === "loading" && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 bg-white/10 rounded" />
                        <div className="h-2 w-1/3 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {state === "error" && (
                <div className="text-center py-8 text-white/70">
                  <div className="text-3xl mb-2">🌐</div>
                  <p className="font-medium">We couldn’t load results</p>
                  <button className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                    Retry
                  </button>
                </div>
              )}

              {state === "empty" && (
                <div className="text-center py-10 text-white/60">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="font-medium">No results found</p>
                  <p className="text-xs text-white/40">
                    Try a different keyword
                  </p>

                  <div className="flex justify-center gap-2 mt-4 flex-wrap">
                    {["india", "usa", "france"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleChange(s)}
                        className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {state === "success" &&
                results.map((c, i) => (
                  <div
                    key={c.cca2}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <Image
                      src={c.flags.png}
                      alt={`Flag of ${c.name.common}`}
                      width={40}
                      height={40}
                      unoptimized
                      className="rounded-full object-cover"
                    />

                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {c.name.common}
                      </div>
                      <div className="text-xs text-white/50">
                        {c.region} • {c.capital?.[0] || "No capital"}
                      </div>
                    </div>

                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                      Country
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}