import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PaletteName = 'midnight' | 'goldenHour';

export interface AppTheme {
  palette: PaletteName;
  name: string;
  description: string;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceSubtle: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentStrong: string;
    accentSoft: string;
    accentContrast: string;
    secondaryAccent: string;
    positive: string;
    warning: string;
    danger: string;
    info: string;
    input: string;
    overlay: string;
    tabBar: string;
  };
  type: {
    display: number;
    title: number;
    heading: number;
    body: number;
    label: number;
    caption: number;
    fontFamily: {
      display: string;
    };
    lineHeight: {
      display: number;
      title: number;
      heading: number;
      body: number;
      label: number;
      caption: number;
    };
    weight: {
      regular: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
  };
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

const paletteTokens: Record<PaletteName, AppTheme> = {
  midnight: {
    palette: 'midnight',
    name: 'Midnight',
    description: 'Quiet shadows, warm tungsten highlights',
    colors: {
      background: '#0B1018',
      surface: '#131B26',
      surfaceElevated: '#1B2735',
      surfaceSubtle: '#202E3E',
      border: '#2C3B4B',
      text: '#F4F0E8',
      textSecondary: '#B5BEC8',
      textMuted: '#8995A4',
      accent: '#D6A85F',
      accentStrong: '#E8BC74',
      accentSoft: '#382D1F',
      accentContrast: '#20170A',
      secondaryAccent: '#82AAB2',
      positive: '#83B99A',
      warning: '#E6AF61',
      danger: '#DF827A',
      info: '#82AAB2',
      input: '#101822',
      overlay: 'rgba(3, 8, 14, 0.76)',
      tabBar: '#111923',
    },
    type: {
      display: 36, title: 28, heading: 20, body: 16, label: 13, caption: 11,
      lineHeight: { display: 42, title: 34, heading: 27, body: 24, label: 18, caption: 16 },
      fontFamily: { display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) || 'serif' },
      weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    },
    space: { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32 },
    radius: { sm: 8, md: 14, lg: 20, pill: 999 },
  },
  goldenHour: {
    palette: 'goldenHour',
    name: 'Golden Hour',
    description: 'Soft paper, amber light, calm contrast',
    colors: {
      background: '#F1EBDD',
      surface: '#FBF7EE',
      surfaceElevated: '#FFFCF5',
      surfaceSubtle: '#EAE0CF',
      border: '#D8CBB7',
      text: '#28251F',
      textSecondary: '#5F594F',
      textMuted: '#70675B',
      accent: '#98572D',
      accentStrong: '#82451F',
      accentSoft: '#F0DFCC',
      accentContrast: '#FFF8EE',
      secondaryAccent: '#426C70',
      positive: '#397455',
      warning: '#97601E',
      danger: '#A5443B',
      info: '#426C70',
      input: '#FFFDF8',
      overlay: 'rgba(34, 27, 19, 0.54)',
      tabBar: '#F8F2E8',
    },
    type: {
      display: 36, title: 28, heading: 20, body: 16, label: 13, caption: 11,
      lineHeight: { display: 42, title: 34, heading: 27, body: 24, label: 18, caption: 16 },
      fontFamily: { display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) || 'serif' },
      weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
    },
    space: { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32 },
    radius: { sm: 8, md: 14, lg: 20, pill: 999 },
  },
};

interface ThemeContextValue {
  theme: AppTheme;
  isLoading: boolean;
  setPalette: (palette: PaletteName) => Promise<void>;
}

const THEME_STORAGE_KEY = 'kairo_palette';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const LEGACY_COLOR_TOKENS: Record<string, keyof AppTheme['colors']> = {
  '#0f172a': 'background',
  '#0b1018': 'background',
  '#111827': 'background',
  '#1e293b': 'surface',
  '#131b26': 'surface',
  '#202e3e': 'surfaceSubtle',
  '#334155': 'border',
  '#475569': 'border',
  '#312e81': 'accentSoft',
  '#422006': 'accentSoft',
  '#7f1d1d': 'danger',
  '#f87171': 'danger',
  '#fca5a5': 'danger',
  '#fde68a': 'warning',
  '#c4b5fd': 'accentStrong',
  '#f8fafc': 'text',
  '#ffffff': 'text',
  '#fff': 'text',
  '#f4f0e8': 'text',
  '#f1f5f9': 'text',
  '#e2e8f0': 'textSecondary',
  '#cbd5e1': 'textSecondary',
  '#94a3b8': 'textSecondary',
  '#64748b': 'textMuted',
  '#3b82f6': 'accent',
  '#2563eb': 'accentStrong',
  '#10b981': 'positive',
  '#059669': 'positive',
  '#f59e0b': 'warning',
  '#ef4444': 'danger',
};

function mapLegacyColors<T>(value: T, theme: AppTheme, scope = '', property = ''): T {
  if (typeof value === 'string') {
    const token = LEGACY_COLOR_TOKENS[value.toLowerCase()];
    if (token) {
      const buttonText = scope.toLowerCase().includes('button')
        || scope.toLowerCase().includes('btn')
        || scope.toLowerCase().includes('action')
        || scope.toLowerCase().includes('save')
        || scope.toLowerCase().includes('submit')
        || scope.toLowerCase().includes('fab');
      return (buttonText && token === 'text' ? theme.colors.accentContrast : theme.colors[token]) as T;
    }

    if (property === 'fontWeight') {
      if (value === 'bold' || value === '700') return theme.type.weight.bold as T;
      if (value === '600') return theme.type.weight.semibold as T;
      if (value === '500') return theme.type.weight.medium as T;
      if (value === '400' || value === 'normal') return theme.type.weight.regular as T;
    }
    if (property === 'fontFamily' && /display|title|heading/i.test(scope)) {
      return theme.type.fontFamily.display as T;
    }
    return value as T;
  }

  if (typeof value === 'number' && property === 'fontSize') {
    const name = scope.toLowerCase();
    if (name.includes('display')) return theme.type.display as T;
    if (name.includes('cardtitle') || name.includes('sectiontitle') || name.includes('modaltitle')
      || name.includes('emptytitle') || name.includes('heading')) {
      return theme.type.heading as T;
    }
    if (name.includes('title') || name.includes('headertitle')) return theme.type.title as T;
    if (name.includes('caption') || name.includes('meta') || name.includes('date')
      || name.includes('status') || name.includes('hint')) {
      return theme.type.caption as T;
    }
    if (name.includes('label')) return theme.type.label as T;
    if (name.includes('subtitle') || name.includes('body')) return theme.type.body as T;
  }

  if (typeof value === 'number' && property === 'lineHeight') {
    const name = scope.toLowerCase();
    if (name.includes('display')) return theme.type.lineHeight.display as T;
    if (name.includes('title')) return theme.type.lineHeight.title as T;
    if (name.includes('heading') || name.includes('sectiontitle')) return theme.type.lineHeight.heading as T;
    if (name.includes('subtitle') || name.includes('description') || name.includes('subtext')) {
      return theme.type.lineHeight.body as T;
    }
  }

  if (typeof value === 'number' && property === 'borderRadius') {
    if (value === 8) return theme.radius.sm as T;
    if (value === 12 || value === 14 || value === 16) return theme.radius.md as T;
    if (value === 20 || value === 24) return theme.radius.lg as T;
    if (value >= 999) return theme.radius.pill as T;
  }

  if (typeof value === 'number' && /^(padding|margin|gap)/i.test(property)) {
    if (value === 4) return theme.space.xs as T;
    if (value === 8) return theme.space.sm as T;
    if (value === 12) return theme.space.md as T;
    if (value === 16 || value === 18) return theme.space.lg as T;
    if (value === 20 || value === 24) return theme.space.xl as T;
    if (value === 32) return theme.space.xxl as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => mapLegacyColors(item, theme, scope, property)) as T;
  }

  if (value && typeof value === 'object') {
    const mapped: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
      mapped[key] = mapLegacyColors(nestedValue, theme, `${scope} ${key}`, key);
    });
    return mapped as T;
  }

  return value;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [palette, setPaletteState] = useState<PaletteName>('midnight');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (active && (stored === 'midnight' || stored === 'goldenHour')) {
          setPaletteState(stored);
        }
      })
      .catch(error => {
        console.error('Unable to load saved KAIRO palette:', error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setPalette = async (nextPalette: PaletteName) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPalette);
    setPaletteState(nextPalette);
  };

  return (
    <ThemeContext.Provider value={{ theme: paletteTokens[palette], isLoading, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const usePaletteStyles = <T extends object>(styles: T): T => {
  const { theme } = useTheme();
  return useMemo(() => mapLegacyColors(styles, theme), [styles, theme]);
};
