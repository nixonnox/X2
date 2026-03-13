"use client";

import { useEffect, useState } from "react";

/**
 * hydration mismatch 방지용 훅.
 * 클라이언트에서만 렌더링해야 하는 컴포넌트에 사용한다.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
