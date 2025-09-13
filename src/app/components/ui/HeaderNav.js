"use client";
import Link from "next/link";

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 border-b border-neutral-900">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-neutral-100" />
          <span className="font-medium">Title</span>
        </div>
        <nav className="flex items-center gap-8 text-sm text-neutral-300">
          <Link href="#" className="hover:text-white">Game 1</Link>
          <Link href="#" className="hover:text-white">Game 2</Link>
        </nav>
      </div>
    </header>
  );
}
