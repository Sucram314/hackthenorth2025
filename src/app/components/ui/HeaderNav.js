"use client";
export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur border-b border-neutral-900">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-neutral-100" />
          <span className="font-medium">Title</span>
        </div>
        <nav className="flex items-center gap-8 text-sm text-neutral-300">
          <span className="hover:text-white cursor-default">Game 1</span>
          <span className="hover:text-white cursor-default">Game 2</span>
        </nav>
      </div>
    </header>
  );
}
