import { useState, useEffect, useCallback } from 'react';
import { DARK, LIGHT } from '../design/tokens';

/**
 * Returns [resolvedPalette, toggleTheme].
 * resolvedPalette is DARK or LIGHT (plain hex objects), matching whatever
 * data-theme attribute is on <html>. Use only where CSS vars can't be resolved
 * (e.g. SVG <linearGradient> stopColor).
 */
export function useTheme() {
  const getTheme = () =>
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  }, [theme]);

  return [theme === 'light' ? LIGHT : DARK, toggle, theme];
}
