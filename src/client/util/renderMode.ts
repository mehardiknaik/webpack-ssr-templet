type RenderMode = 'ssr' | 'static';

export const getRenderMode = (): RenderMode => {
    if (typeof document === 'undefined') {
        return 'ssr';
    }

    return (
        document.documentElement.dataset.renderMode as RenderMode
    ) || 'static';
};

export const isSSR = getRenderMode() === 'ssr';
export const isStatic = getRenderMode() === 'static';