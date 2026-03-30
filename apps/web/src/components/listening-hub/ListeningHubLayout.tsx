"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "section-overview", label: "개요" },
  { id: "section-cluster", label: "클러스터" },
  { id: "section-pathfinder", label: "검색 경로" },
  { id: "section-roadview", label: "사용자 여정" },
  { id: "section-persona", label: "페르소나" },
  { id: "section-insight", label: "인사이트" },
  { id: "section-action", label: "액션" },
  { id: "section-evidence", label: "근거자료" },
] as const;

type ListeningHubLayoutProps = {
  children: React.ReactNode;
  hasResult: boolean;
};

export function ListeningHubLayout({
  children,
  hasResult,
}: ListeningHubLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    if (!hasResult) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 },
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [hasResult]);

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div>
      {/* Sticky Section Navigation */}
      {hasResult && (
        <div className="sticky top-0 z-20 -mx-1 mb-4 overflow-x-auto border-b border-[var(--border)] bg-[var(--background)]/95 px-1 backdrop-blur-sm">
          <nav className="flex gap-0.5 py-1.5">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
