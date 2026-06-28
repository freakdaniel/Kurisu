/**
 * JSX intrinsic-element declarations for the `<adw-*>` custom elements from
 * `@gjsify/adwaita-web`.
 */

import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'adw-preferences-group': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        description?: string;
        children?: React.ReactNode;
      };
      'adw-action-row': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        subtitle?: string;
        activatable?: boolean;
        children?: React.ReactNode;
      };
      'adw-switch-row': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        subtitle?: string;
        active?: boolean;
        children?: React.ReactNode;
      };
      'adw-combo-row': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        subtitle?: string;
        items?: string[];
        selected?: number;
        children?: React.ReactNode;
        onNotifySelected?: (event: CustomEvent<{ selected: number }>) => void;
      };
    }
  }
}

declare module '@gjsify/adwaita-web' {
  export * from '@gjsify/adwaita-web/dist/index';
}