import { memo, useMemo } from 'react';

export interface AdwaitaIconProps {
  /**
   * SVG markup for an Adwaita symbolic icon. Symbolic icons are expected to
   * use `fill="currentColor"` so the icon can be re-coloured by setting CSS
   * `color` on the wrapping element.
   *
   * Typical source: `@gjsify/adwaita-icons` (e.g. `listAddSymbolic`).
   */
  source: string;
  /** Pixel size – applied to both width and height. Defaults to 16. */
  size?: number;
  /**
   * Optional aria-label. When provided the icon is announced to assistive
   * technologies. Omit for purely decorative icons.
   */
  title?: string;
  className?: string;
}

/**
 * Pre-process an Adwaita symbolic SVG string so it can be rendered inline
 * with `dangerouslySetInnerHTML`:
 *
 *   * strips the explicit `width` / `height` attributes so the icon can be
 *     scaled via the wrapper element,
 *   * sets `fill="currentColor"` on the root `<svg>` so descendants inherit
 *     the wrapper text colour,
 *   * strips nested `color="..."` attributes and any hardcoded `fill="..."`
 *     so individual elements can't override the wrapper's `currentColor`
 *     (e.g. `preferences-system-network-symbolic` ships with
 *     `<g color="#bebebe" fill="currentColor">` which would otherwise
 *     lock the icon at a fixed grey regardless of theme / hover state),
 *   * collapses whitespace to keep the rendered DOM small.
 *
 * The SVG string originates from a vetted upstream package (@gjsify/adwaita-
 * icons) that mirrors the official GNOME Adwaita icon theme; the strings are
 * not user-supplied, so rendering via `dangerouslySetInnerHTML` is safe.
 */
function normalizeAdwaitaSvg(svg: string): string {
  let normalized = svg.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/\swidth="[^"]*"/gi, '');
  normalized = normalized.replace(/\sheight="[^"]*"/gi, '');
  // Remove `color="..."` on any nested element. SVG's `color` attribute
  // controls `currentColor` for the subtree, so a hardcoded value (commonly
  // `#bebebe` or `#000`) would override the wrapper's colour and make the
  // icon unresponsive to theme / hover changes.
  normalized = normalized.replace(/\scolor="[^"]*"/gi, '');
  // Replace any hardcoded `fill="<colour>"` with `fill="currentColor"`.
  // Leaves `fill="currentColor"` and `fill="none"` / `fill-rule` etc. alone.
  normalized = normalized.replace(
    /\sfill="(?!currentColor|none|inherit)([^"]*)"/gi,
    ' fill="currentColor"',
  );
  normalized = normalized.replace(
    /<svg\b/i,
    '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="currentColor"',
  );
  return normalized;
}

function AdwaitaIconComponent({ source, size = 16, title, className }: AdwaitaIconProps) {
  const markup = useMemo(() => normalizeAdwaitaSvg(source), [source]);

  const accessibilityProps = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const, focusable: false };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        lineHeight: 0,
        color: 'currentColor',
      }}
      {...accessibilityProps}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export const AdwaitaIcon = memo(AdwaitaIconComponent);