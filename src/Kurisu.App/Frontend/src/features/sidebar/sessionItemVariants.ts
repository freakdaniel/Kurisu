/**
 * Framer-motion variants shared across the session list and the row. Lives
 * in its own module so `SessionRow.tsx` only exports React components and
 * stays Fast-Refresh friendly.
 */
export const sessionItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { opacity: { duration: 0.15 }, x: { duration: 0.2 }, delay: i * 0.03 },
  }),
  exit: { opacity: 0, x: -4, transition: { duration: 0.1 } },
};
