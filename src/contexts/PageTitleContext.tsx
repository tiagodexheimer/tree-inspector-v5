'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface PageTitleContextType {
    title: string;
    icon: ReactNode | null;
    setPageTitle: (title: string, icon?: ReactNode) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export function PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageInfo, setPageInfo] = useState<{ title: string; icon: ReactNode | null }>({
        title: '',
        icon: null,
    });

    const setPageTitle = useCallback((newTitle: string, newIcon: ReactNode = null) => {
        setPageInfo((prev) => {
            const isTitleSame = prev.title === newTitle;
            let isIconSame = prev.icon === newIcon;

            // Comparação de elementos React para evitar loops com novas referências de JSX
            if (!isIconSame && React.isValidElement(prev.icon) && React.isValidElement(newIcon)) {
                isIconSame = prev.icon.type === newIcon.type;
            }

            if (isTitleSame && isIconSame) {
                return prev;
            }

            return { title: newTitle, icon: newIcon };
        });
    }, []);

    return (
        <PageTitleContext.Provider value={{ title: pageInfo.title, icon: pageInfo.icon, setPageTitle }}>
            {children}
        </PageTitleContext.Provider>
    );
}

export function usePageTitle(title: string, icon: ReactNode = null) {
    const context = useContext(PageTitleContext);
    if (!context) {
        throw new Error('usePageTitle must be used within a PageTitleProvider');
    }

    const { setPageTitle } = context;

    useEffect(() => {
        setPageTitle(title, icon);
    }, [title, icon, setPageTitle]);
}

export function useTitleContext() {
    const context = useContext(PageTitleContext);
    if (!context) {
        throw new Error('useTitleContext must be used within a PageTitleProvider');
    }
    return context;
}
