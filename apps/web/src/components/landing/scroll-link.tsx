"use client";

import type { ReactNode } from "react";

interface ScrollLinkProps {
  targetId: string;
  className?: string;
  children: ReactNode;
}

/**
 * 앵커 링크 클릭 시 smooth scroll 처리.
 * 랜딩 페이지 전체를 클라이언트 컴포넌트로 만들지 않기 위해 분리.
 */
export function ScrollLink({ targetId, className, children }: ScrollLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
