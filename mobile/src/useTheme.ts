import { createContext, useContext } from 'react';
import { DARK, type Palette } from './theme';

export const ThemeContext = createContext<Palette>(DARK);
export const useTheme = () => useContext(ThemeContext);

export const fonts = {
  heading: 'Inter_700Bold',
  hero: 'Inter_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
  mono: 'Inter_500Medium',
};
