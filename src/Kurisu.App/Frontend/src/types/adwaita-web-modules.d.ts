/**
 * Module shims for transitive dependencies of `@gjsify/adwaita-web` that the
 * package's source TypeScript files reference but don't ship working
 * declarations for
 */

declare module '@gjsify/adwaita-fonts';

declare module '@gjsify/adwaita-web/styles.generated.js' {
  export const ADWAITA_WEB_CSS: string;
}

declare module '@gjsify/adwaita-web/src/styles.generated.js' {
  export const ADWAITA_WEB_CSS: string;
}

declare module '*/styles.generated.js' {
  export const ADWAITA_WEB_CSS: string;
}