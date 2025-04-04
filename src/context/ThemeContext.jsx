import { createContext, useContext, useState, useCallback } from 'react';

const themeColors = {
    light: {
        barBackground: '#ffffff',
        background: '#f0f0f0',
        barText: '#333333',

        border: '#dddddd',
        shadow: '0 2px 3px rgba(0, 0, 0, 0.3)',
        hover: '#cfcfcf',

        edges: '0000ff',
    },
    dark: {
        background: '#333333',
        barBackground: '#1a1a1a',
        barText: '#ffffff',

        border: '#444444',
        shadow: '0 2px 4px rgba(249, 249, 249, 0.33)',
        hover: '#242424',

        edges: '#ff0',
    }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [darkTheme, setDarkTheme] = useState(false);

    const getColor = useCallback((colorKey) => {
        return themeColors[darkTheme ? 'dark' : 'light'][colorKey];
    }, [darkTheme]);

    return (
        <ThemeContext.Provider value={{ darkTheme, setDarkTheme, getColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    return useContext(ThemeContext);
}