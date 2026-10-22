import { useState, useEffect } from 'react';
import { LayoutSettings } from '../types';

const STORAGE_KEY = 'layoutSettings';

const getDefaultLayoutSettings = (): LayoutSettings => ({
    fontSize: 12,
    lineHeight: '1.2',
    pageSize: 'A4',
    fontFamily: '"CMU Serif", "Computer Modern Serif", Georgia, serif',
    margins: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20
    }
});

const loadFromLocalStorage = (): LayoutSettings | null => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error(`Error loading ${STORAGE_KEY}:`, error);
        return null;
    }
};

const saveToLocalStorage = (data: LayoutSettings): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${STORAGE_KEY}:`, error);
    }
};

export const useLayoutSettings = () => {
    const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() => {
        const saved = loadFromLocalStorage();
        return saved || getDefaultLayoutSettings();
    });

    useEffect(() => {
        saveToLocalStorage(layoutSettings);
    }, [layoutSettings]);

    const updateLayoutSettings = (field: keyof LayoutSettings, value: any) => {
        setLayoutSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateMargin = (side: keyof LayoutSettings['margins'], value: number) => {
        setLayoutSettings(prev => ({
            ...prev,
            margins: {
                ...prev.margins,
                [side]: value
            }
        }));
    };

    const resetLayoutSettings = () => {
        setLayoutSettings(getDefaultLayoutSettings());
        localStorage.removeItem(STORAGE_KEY);
    };

    return {
        layoutSettings,
        updateLayoutSettings,
        updateMargin,
        resetLayoutSettings
    };
};