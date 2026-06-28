import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '@gjsify/adwaita-web';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';
import { useBootstrap } from '@/hooks/useBootstrap';
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
  /** Toggles the in-settings search bar. */
  searchActive: boolean;
  onExitSearch: () => void;
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
 * centred floating sheet with a flat header, a row of wrapping tab-pills
 * (the categories), and a scrolled body of `AdwPreferencesGroup` rows.
 *
 * The tab-pill row uses plain `display: flex; flex-wrap: wrap` so the
 * categories automatically wrap to a new line when the dialog is narrow
 * (matches image 1 — fits in one line on wide dialogs, wraps to a second
 * line on narrow ones, matching image 2).
 */
export function SettingsDialog({ active, onActiveChange, onClose, searchActive, onExitSearch }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { bootstrap } = useBootstrap();
  const [searchQuery, setSearchQuery] = useState('');

  const [accent, setAccent] = useState('blue');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [usePowerfulModel, setUsePowerfulModel] = useState(false);
  const [errorReports, setErrorReports] = useState(false);

  const scrimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchActive) {
          onExitSearch();
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, onExitSearch, searchActive]);

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
            width: 'min(720px, calc(100vw - 48px))',
            maxHeight: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            background: adwaitaColors.windowBg,
            borderRadius: '14px',
            border: `1px solid ${adwaitaColors.borderStrong}`,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 24px 32px -8px rgba(0, 0, 0, 0.36)',
            overflow: 'hidden',
          }}
        >
          {/* Header — flat title bar mirroring AdwHeaderBar `centering-policy: strict` */}
          <HStack
            h="48px"
            minH="48px"
            px={3}
            spacing={2}
            align="center"
            borderBottom="1px solid"
            borderColor={adwaitaColors.border}
            bg={adwaitaColors.windowBg}
            sx={{ flexShrink: 0 }}
          >
            <Text
              flex={1}
              textAlign="center"
              fontSize="14px"
              fontWeight={600}
              color={adwaitaColors.fg}
              noOfLines={1}
            >
              {t('settings.title')}
            </Text>
            <Button
              aria-label={t('settings.close')}
              variant="ghost"
              size="sm"
              h="30px"
              w="30px"
              minW="30px"
              p={0}
              borderRadius="8px"
              color={adwaitaColors.fgSecondary}
              _hover={{ bg: adwaitaColors.destructive, color: '#fff' }}
              onClick={onClose}
            >
              <AdwaitaIcon source={adwaitaIconSources.windowClose} size={14} />
            </Button>
          </HStack>

          {/* Search row (toggled) */}
          <AnimatePresence>
            {searchActive && (
              <motion.div
                key="settings-search"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ overflow: 'hidden', flexShrink: 0 }}
              >
                <HStack
                  h="44px"
                  minH="44px"
                  px={5}
                  spacing={2}
                  align="center"
                  borderBottom="1px solid"
                  borderColor={adwaitaColors.border}
                  bg={adwaitaColors.windowBg}
                >
                  <AdwaitaIcon source={adwaitaIconSources.search} size={14} />
                  <Input
                    autoFocus
                    variant="unstyled"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('settings.searchPlaceholder')}
                    fontSize="13.5px"
                    color={adwaitaColors.fg}
                    _placeholder={{ color: adwaitaColors.fgMuted }}
                    h="32px"
                    flex={1}
                  />
                  {searchQuery && (
                    <Button
                      aria-label={t('settings.clearSearch')}
                      onClick={() => setSearchQuery('')}
                      variant="ghost"
                      h="24px"
                      w="24px"
                      minW="24px"
                      p={0}
                      borderRadius="6px"
                      color={adwaitaColors.fgMuted}
                    >
                      <AdwaitaIcon source={adwaitaIconSources.searchClear} size={12} />
                    </Button>
                  )}
                </HStack>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab pills (categories). Plain flex-wrap so they automatically
              wrap to a new line when the dialog is narrow. */}
          <Box
            px={5}
            pt={3}
            pb={2}
            borderBottom="1px solid"
            borderColor={adwaitaColors.border}
            bg={adwaitaColors.windowBg}
            sx={{ flexShrink: 0 }}
          >
            <Box
              role="tablist"
              aria-label={t('settings.title')}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '999px',
                      border: 'none',
                      background: isActive ? adwaitaColors.accent : 'transparent',
                      color: isActive ? '#fff' : adwaitaColors.fgSecondary,
                      fontSize: '12.5px',
                      fontWeight: isActive ? 600 : 500,
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
                    <AdwaitaIcon source={category.iconSource} size={13} />
                    <span>{t(category.labelKey)}</span>
                  </button>
                );
              })}
            </Box>
          </Box>

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
                <adw-preferences-group
                  title={t('settings.providers.section')}
                  description={t('settings.providers.empty')}
                >
                  <adw-action-row>
                    <div slot="suffix">
                      <Text fontSize="13px" color={adwaitaColors.fgMuted}>
                        {t('settings.comingSoon')}
                      </Text>
                    </div>
                  </adw-action-row>
                </adw-preferences-group>
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