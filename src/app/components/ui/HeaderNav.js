"use client";
import ThemeToggle from "@/app/components/theme/ThemeToggle";

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-foreground" />
          <span className="font-medium text-foreground">Toothrush</span>
        </div>
        <nav className="flex items-center gap-8 text-sm">
          {/* <span className="text-muted-foreground hover:text-foreground cursor-default">Game 1</span>
          <span className="text-muted-foreground hover:text-foreground cursor-default">Game 2</span>
          <ThemeToggle /> */}
        </nav>
      </div>
    </header>
  );
}
