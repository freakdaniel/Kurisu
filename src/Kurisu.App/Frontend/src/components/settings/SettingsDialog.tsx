import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '@gjsify/adwaita-web';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';
import { useBootstrap } from '@/hooks/useBootstrap';
import type { ProviderStatusSnapshot } from '@/types/desktop';
import { ProviderIcon } from '@/features/welcome/ProviderIcons';
import { AccentColorRow } from './AccentColorRow';
import {
  SETTINGS_CATEGORIES,
  type SettingsCategoryKey,
} from './settingsCategories';

export interface SettingsDialogProps {
  /** Currently selected category. */
  active: SettingsCategoryKey;
  onActiveChange: (next: SettingsCategoryKey) => void;
  /** Closes settings and returns to the chat workspace. */
  onClose: () => void;
}

/** Fades the content panel in with a slight upward translate. */
const contentVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, delay: 0.08, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Modal settings dialog. Modeled on `AdwPreferencesDialog` (GNOME): a
 * centred floating sheet with a flat header showing the dialog title, a
 * scrolled body of `AdwPreferencesGroup` rows, and a row of category tabs
 * pinned to the bottom (icon above label).
 *
 * The category row uses a CSS grid so every tab gets equal width and the
 * row never reflows when switching active categories; long labels ellipse
 * rather than stretching the column.
 */
export function SettingsDialog({ active, onActiveChange, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { bootstrap } = useBootstrap();

  const [accent, setAccent] = useState('blue');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [usePowerfulModel, setUsePowerfulModel] = useState(false);
  const [errorReports, setErrorReports] = useState(false);

  // Split the provider list received from the desktop bridge into "configured
  // (has API key)" and "available (still needs an API key)" so each can be
  // rendered as its own preference group. Sorted alphabetically by display
  // name so the lists stay stable across renders.
  const providerLists = useMemo(() => {
    const all: ProviderStatusSnapshot[] =
      bootstrap?.kurisuProviders?.providers ?? [];
    const byName = (a: ProviderStatusSnapshot, b: ProviderStatusSnapshot) =>
      a.displayName.localeCompare(b.displayName);
    return {
      connected: all.filter((provider) => provider.hasApiKey).sort(byName),
      available: all.filter((provider) => !provider.hasApiKey).sort(byName),
    };
  }, [bootstrap?.kurisuProviders?.providers]);

  const scrimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Full-cover scrim — clicking it dismisses the modal. */}
      <Box
        ref={scrimRef}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: `${40}px`, // below the application title bar
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* The dialog sheet. Clicks inside must not bubble to the scrim. */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            // Sizing depends exclusively on the application window: width and
            // height scale with the viewport and never reflow when the number
            // of settings rows changes (the body just scrolls).
            width: 'min(720px, calc(100vw - 48px))',
            height: 'min(680px, calc(100vh - 96px))',
            maxHeight: 'calc(100vh - 96px)',
            display: 'flex',
            flexDirection: 'column',
            background: adwaitaColors.windowBg,
            borderRadius: '14px',
            border: `1px solid ${adwaitaColors.borderStrong}`,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 24px 32px -8px rgba(0, 0, 0, 0.36)',
            overflow: 'hidden',
          }}
        >
          {/* Top bar — centred dialog title. No buttons: dismissed via
              Escape or scrim click. */}
          <HStack
            h="48px"
            minH="48px"
            px={3}
            spacing={0}
            align="center"
            justify="center"
            borderBottom="1px solid"
            borderColor={adwaitaColors.border}
            bg={adwaitaColors.windowBg}
            sx={{ flexShrink: 0 }}
          >
            <Text
              fontSize="14px"
              fontWeight={600}
              color={adwaitaColors.fg}
              noOfLines={1}
            >
              {t('settings.title')}
            </Text>
          </HStack>

          {/* Scrolled body — pages of preferences groups. */}
          <Box
            as="main"
            role="main"
            flex={1}
            minH="0"
            overflowY="auto"
            overflowX="hidden"
            px={6}
            py={5}
          >
            <motion.div
              key={active}
              initial="hidden"
              animate="visible"
              variants={contentVariants}
            >
              {active === 'general' && (
                <VStack align="stretch" spacing={6}>
                  <adw-preferences-group
                    title={t('settings.general.appearance')}
                  >
                    <SelectRow
                      title={t('settings.general.colorScheme')}
                      options={[
                        t('settings.general.themeOptions.auto'),
                        t('settings.general.themeOptions.light'),
                        t('settings.general.themeOptions.dark'),
                      ]}
                      defaultValue={2}
                    />
                    <adw-action-row
                      title={t('settings.general.accent')}
                    >
                      <div slot="suffix">
                        <AccentColorRow
                          value={accent}
                          onChange={setAccent}
                          renderSwatchLabel={(id) => t(`settings.general.accentOptions.${id}`)}
                          inline
                        />
                      </div>
                    </adw-action-row>
                  </adw-preferences-group>
                  <adw-preferences-group
                    title={t('settings.general.language')}
                  >
                    <SelectRow
                      title={t('settings.general.appLanguage')}
                      options={[t('settings.comingSoon')]}
                      defaultValue={0}
                    />
                  </adw-preferences-group>
                </VStack>
              )}

              {active === 'providers' && (
                <VStack align="stretch" spacing={6}>
                  <adw-preferences-group
                    title={t('settings.providers.connectedSection')}
                  >
                    {providerLists.connected.length === 0 ? (
                      <Box px={4} py={3}>
                        <Text fontSize="12.5px" color={adwaitaColors.fgMuted}>
                          {t('settings.providers.emptyConnected')}
                        </Text>
                      </Box>
                    ) : (
                      providerLists.connected.map((provider, idx) => (
                        <ProviderRow
                          key={provider.providerId}
                          provider={provider}
                          connected
                          isLast={idx === providerLists.connected.length - 1}
                        />
                      ))
                    )}
                  </adw-preferences-group>
                  <adw-preferences-group
                    title={t('settings.providers.availableSection')}
                  >
                    {providerLists.available.map((provider, idx) => (
                      <ProviderRow
                        key={provider.providerId}
                        provider={provider}
                        isLast={idx === providerLists.available.length - 1}
                      />
                    ))}
                  </adw-preferences-group>
                </VStack>
              )}

              {active === 'voice' && (
                <adw-preferences-group
                  title={t('settings.voice.section')}
                >
                  <SwitchRow
                    title={t('settings.voice.enableInput')}
                    subtitle={t('settings.voice.enableInputCaption')}
                    active={voiceEnabled}
                    onActiveChange={setVoiceEnabled}
                  />
                </adw-preferences-group>
              )}

              {active === 'models' && (
                <adw-preferences-group
                  title={t('settings.models.section')}
                >
                  <SwitchRow
                    title={t('settings.models.usePowerful')}
                    subtitle={t('settings.models.usePowerfulCaption')}
                    active={usePowerfulModel}
                    onActiveChange={setUsePowerfulModel}
                  />
                  <Text fontSize="12px" color={adwaitaColors.fgMuted} px={1} pt={2}>
                    {t('settings.comingSoon')}
                  </Text>
                </adw-preferences-group>
              )}

              {active === 'privacy' && (
                <adw-preferences-group
                  title={t('settings.privacy.section')}
                >
                  <SwitchRow
                    title={t('settings.privacy.errorReports')}
                    subtitle={t('settings.privacy.errorReportsCaption')}
                    active={errorReports}
                    onActiveChange={setErrorReports}
                  />
                  <SelectRow
                    title={t('settings.privacy.clearSessions')}
                    options={[t('settings.comingSoon')]}
                    defaultValue={0}
                  />
                </adw-preferences-group>
              )}

              {active === 'storage' && (
                <adw-preferences-group
                  title={t('settings.storage.section')}
                >
                  <adw-action-row
                    title={t('settings.storage.workspaceRoot')}
                  >
                    <div slot="suffix">
                      <Text fontSize="13px" color={adwaitaColors.fgSecondary}>
                        {bootstrap?.workspaceRoot || t('settings.comingSoon')}
                      </Text>
                    </div>
                  </adw-action-row>
                  <adw-action-row
                    title={t('settings.storage.runtimeBase')}
                  >
                    <div slot="suffix">
                      <Text fontSize="13px" color={adwaitaColors.fgSecondary}>
                        {bootstrap?.kurisuRuntime?.runtimeBaseDirectory || t('settings.comingSoon')}
                      </Text>
                    </div>
                  </adw-action-row>
                  <adw-action-row
                    title={t('settings.storage.openDataFolder')}
                  >
                    <div slot="suffix">
                      <Text fontSize="13px" color={adwaitaColors.fgMuted}>
                        {t('settings.comingSoon')}
                      </Text>
                    </div>
                  </adw-action-row>
                </adw-preferences-group>
              )}

              {active === 'about' && (
                <adw-preferences-group
                  title={t('settings.about.section')}
                >
                  <adw-action-row
                    title="Kurisu"
                    subtitle={`${t('settings.about.version')} 0.1.0`}
                  />
                  <adw-action-row>
                    <div slot="suffix">
                      <Text fontSize="13px" color={adwaitaColors.fgSecondary} lineHeight={1.5}>
                        {t('settings.about.description')}
                      </Text>
                    </div>
                  </adw-action-row>
                </adw-preferences-group>
              )}
            </motion.div>
          </Box>

          {/* Categories pinned to the bottom of the dialog. Each tab renders
              the icon above its label (column layout); the row uses plain
              flex-wrap so it keeps working when the dialog is narrow. */}
          <Box
            borderTop="1px solid"
            borderColor={adwaitaColors.border}
            bg={adwaitaColors.windowBg}
            px={4}
            py={2}
            sx={{ flexShrink: 0 }}
          >
            <Box
              role="tablist"
              aria-label={t('settings.title')}
              sx={{
                display: 'grid',
                // All 7 categories must fit in one row inside the 720px dialog.
                // Container width is dialog_width - 32px horizontal padding;
                // 7 cells * 78px + 6 * 4px gap = 570px, leaving headroom for
                // longer labels (e.g. "О программе") at any reasonable
                // viewport width.
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '4px',
              }}
            >
              {SETTINGS_CATEGORIES.map((category) => {
                const isActive = active === category.key;
                return (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onActiveChange(category.key)}
                    title={t(category.labelKey)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      width: '100%',
                      minWidth: 0,
                      minHeight: '52px',
                      padding: '6px 4px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? adwaitaColors.accent : 'transparent',
                      color: isActive ? '#fff' : adwaitaColors.fgSecondary,
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 500,
                      lineHeight: 1.15,
                      cursor: 'pointer',
                      outline: 'none',
                      transition:
                        'background 0.15s ease, color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.06)';
                        e.currentTarget.style.color = adwaitaColors.fg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color =
                          adwaitaColors.fgSecondary;
                      }
                    }}
                  >
                    <AdwaitaIcon source={category.iconSource} size={18} />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {t(category.labelKey)}
                    </span>
                  </button>
                );
              })}
            </Box>
          </Box>
        </motion.div>
      </Box>
    </>
  );
}

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  active: boolean;
  onActiveChange: (next: boolean) => void;
}

/**
 * Thin wrapper around `<adw-switch-row>` that sets the title / subtitle
 * attributes and the `active` flag imperatively through a ref — React 18
 * would otherwise hand them off as DOM properties, which the custom
 * element doesn't read.
 */
function SwitchRow({ title, subtitle, active, onActiveChange }: SwitchRowProps) {
  const setRef = (node: HTMLElement & { active?: boolean } | null) => {
    if (!node) return;
    node.setAttribute('title', title);
    if (subtitle) node.setAttribute('subtitle', subtitle);
    if (typeof node.active === 'boolean') node.active = active;
    node.addEventListener('notify::active', (event: Event) => {
      const detail = (event as CustomEvent<{ active: boolean }>).detail;
      onActiveChange(detail.active);
    });
  };

  return (
    <adw-switch-row ref={setRef} />
  );
}

interface SelectRowProps {
  title: string;
  options: string[];
  defaultValue?: number;
  onChange?: (selected: number) => void;
  suffix?: ReactNode;
}

/**
 * React-side replacement for `<adw-combo-row>`, rendered as an
 * `<adw-action-row>` with a styled native `<select>` in the suffix slot.
 * Same reasoning as in earlier revisions: `<adw-combo-row>` reads
 * `title` via `getAttribute`, but React 18 hands `title` off as a DOM
 * property to the custom element, so the value is lost without a
 * imperative `setAttribute` on mount.
 */
function SelectRow({ title, options, defaultValue = 0, onChange, suffix }: SelectRowProps) {
  const setRef = (node: HTMLElement | null) => {
    if (node) node.setAttribute('title', title);
  };

  return (
    <adw-action-row ref={setRef}>
      <div
        slot="suffix"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {suffix}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            defaultValue={options[defaultValue]}
            onChange={(e) => onChange?.(Number((e.target as HTMLSelectElement).value))}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '5px 28px 5px 10px',
              fontFamily: 'inherit',
              fontSize: '13px',
              color: adwaitaColors.fg,
              cursor: 'pointer',
              minWidth: '140px',
              maxWidth: '220px',
            }}
          >
            {options.map((opt, idx) => (
              <option key={idx} value={opt} style={{ background: adwaitaColors.popoverBg, color: adwaitaColors.fg }}>
                {opt}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: adwaitaColors.fgMuted,
            }}
          >
            <AdwaitaIcon source={adwaitaIconSources.arrowRight} size={11} />
          </span>
        </div>
      </div>
    </adw-action-row>
  );
}

interface ProviderRowProps {
  provider: ProviderStatusSnapshot;
  /** True when the user has configured an API key for this provider. */
  connected?: boolean;
  /** Last row in its group — drops the trailing divider. */
  isLast?: boolean;
}

/**
 * Renders one row of the providers preferences group. Plain `HStack` (not
 * `<adw-action-row>`) because we want a custom leading slot for the brand
 * icon — the adwaita web component doesn't expose a configurable prefix
 * slot through React in this version of `@gjsify/adwaita-web`.
 */
function ProviderRow({ provider, connected, isLast }: ProviderRowProps) {
  const { t } = useTranslation();
  return (
    <HStack
      px={4}
      py={2.5}
      spacing={3}
      align="center"
      borderBottom={isLast ? 'none' : '1px solid'}
      borderColor={adwaitaColors.border}
    >
      <ProviderIcon id={provider.providerId} width={22} height={22} />
      <Text
        flex={1}
        fontSize="13px"
        fontWeight={500}
        color={adwaitaColors.fg}
        noOfLines={1}
      >
        {provider.displayName}
      </Text>
      {connected ? (
        <HStack
          px={2}
          py="2px"
          spacing={1}
          align="center"
          borderRadius="6px"
          bg="rgba(78, 175, 105, 0.15)"
          color="#4EAF69"
        >
          <Box
            w="6px"
            h="6px"
            borderRadius="50%"
            bg="#4EAF69"
          />
          <Text
            fontSize="11px"
            fontWeight={600}
            lineHeight={1}
            color="#4EAF69"
          >
            {t('settings.providers.statusConnected')}
          </Text>
        </HStack>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          h="28px"
          px={3}
          borderRadius="8px"
          fontSize="12px"
          fontWeight={500}
          color={adwaitaColors.fgSecondary}
          bg="rgba(255, 255, 255, 0.04)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.08)"
          _hover={{ bg: 'rgba(255, 255, 255, 0.08)' }}
        >
          {t('settings.providers.configure')}
        </Button>
      )}
    </HStack>
  );
}