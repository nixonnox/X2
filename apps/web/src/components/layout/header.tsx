"use client";

import { Menu, Bell } from "lucide-react";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-white px-4 lg:px-6">
      {/* 모바일 메뉴 버튼 */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 우측 액션 */}
      <div className="flex items-center gap-2">
        <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--destructive)]" />
        </button>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-medium text-white">
          U
        </div>
      </div>
    </header>
  );
}
