"use client";

import { useEffect } from "react";

/**
 * Anima la entrada de las secciones marcadas con la clase `.reveal`: cuando entran
 * en el viewport se les añade `.in` (ver `.reveal`/`.reveal.in` en globals.css).
 *
 * No usa useState: manipula classList directamente sobre los nodos del DOM, así que
 * no dispara react-hooks/set-state-in-effect (ver nota en CLAUDE.md).
 */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
