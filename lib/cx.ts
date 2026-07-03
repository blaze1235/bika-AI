/** Join truthy class names. Server-safe (usable in both RSC and client components). */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
