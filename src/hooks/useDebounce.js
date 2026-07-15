"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value (e.g. a search box) so downstream effects
 * — like API queries — only fire once the user pauses typing.
 */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
