import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { adwaitaColors } from '@/lib/themeTokens'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const fontStack = `'Google Sans Variable', 'Google Sans', 'Noto Sans JP', 'Noto Sans SC', 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif`

const monoStack = `'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`

/**
 * Chakra color tokens are kept in sync with the Adwaita dark palette via
 * `adwaitaColors`
 */
export const theme = extendTheme({
  config,
  fonts: {
    heading: fontStack,
    body: fontStack,
    mono: monoStack,
  },
  letterSpacings: {
    heading: '-0.01em',
  },
  colors: {
    brand: {
      50: '#deeafb',
      100: '#b9d2f5',
      200: '#8fb5ee',
      300: '#6597e7',
      400: '#4581e1',
      500: adwaitaColors.accent,
      600: adwaitaColors.accentHover,
      700: '#1a5fb4',
      800: '#134589',
      900: '#0c2c5e',
    },
    gray: {
      50: '#f7f7f8',
      100: '#ededf0',
      200: '#c0bfbc',
      300: '#a0a0a4',
      400: '#8a8a8e',
      500: '#6f6f73',
      600: '#525258',
      700: adwaitaColors.cardBg,
      800: adwaitaColors.headerbarBg,
      850: adwaitaColors.popoverBg,
      900: adwaitaColors.windowBg,
      950: '#161618',
    },
    adwaita: {
      windowBg: adwaitaColors.windowBg,
      viewBg: adwaitaColors.viewBg,
      cardBg: adwaitaColors.cardBg,
      headerbarBg: adwaitaColors.headerbarBg,
      popoverBg: adwaitaColors.popoverBg,
      sidebarBg: adwaitaColors.sidebarBg,
      sidebarSelectedBg: adwaitaColors.sidebarSelectedBg,
      composerBg: adwaitaColors.composerBg,
      accent: adwaitaColors.accent,
      accentHover: adwaitaColors.accentHover,
      destructive: adwaitaColors.destructive,
      success: adwaitaColors.success,
      warning: adwaitaColors.warning,
      fg: adwaitaColors.fg,
      fgSecondary: adwaitaColors.fgSecondary,
      fgMuted: adwaitaColors.fgMuted,
      border: adwaitaColors.border,
      borderStrong: adwaitaColors.borderStrong,
    },
  },
  components: {
    Button: {
      variants: {
        primary: {
          bg: adwaitaColors.accent,
          color: 'white',
          _hover: {
            bg: adwaitaColors.accentHover,
          },
          _active: {
            bg: adwaitaColors.accentHover,
          },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: adwaitaColors.windowBg,
        color: adwaitaColors.fg,
      },
    },
  },
})