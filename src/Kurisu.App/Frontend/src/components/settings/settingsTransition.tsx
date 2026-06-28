/**
 * Coordinates the chat <-> settings transition.
 *
 * Components that should react to the transition subscribe via
 * `useSettingsTransition`. `phase` describes what should currently be on
 * screen, so the chat sidebar / chat content can fade out while settings
 * mounts and the sidebar items can stagger in.
 */

import { createContext, useContext, type ReactNode } from 'react';

export type SettingsTransitionPhase = 'chat' | 'opening' | 'settings' | 'closing';

export interface SettingsTransitionContextValue {
  /** True while the settings dialog is mounted (covers the chat). */
  isOpen: boolean;
  /** Granular phase used by descendants to drive their own enter/exit. */
  phase: SettingsTransitionPhase;
}

const SettingsTransitionContext = createContext<SettingsTransitionContextValue>({
  isOpen: false,
  phase: 'chat',
});

export function SettingsTransitionProvider({
  value,
  children,
}: {
  value: SettingsTransitionContextValue;
  children: ReactNode;
}) {
  return (
    <SettingsTransitionContext.Provider value={value}>
      {children}
    </SettingsTransitionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettingsTransition(): SettingsTransitionContextValue {
  return useContext(SettingsTransitionContext);
}