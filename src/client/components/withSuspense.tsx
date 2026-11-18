// withSuspense.tsx
import React, { Suspense, ComponentType, ReactNode } from 'react';

function withSuspense<T extends object>(
    LazyComponent: React.LazyExoticComponent<ComponentType<T>>,
    fallback: ReactNode = <div>Loading...</div>
): React.FC<T> {
    const SuspendedComponent = (props: T) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} />
        </Suspense>
    );

    const lazyComponentWithMetadata = LazyComponent as unknown as {
        displayName?: string;
        name?: string;
    };
    const displayName =
        lazyComponentWithMetadata.displayName || lazyComponentWithMetadata.name || 'Component';
    SuspendedComponent.displayName = `WithSuspense(${displayName})`;

    return SuspendedComponent;
}

export default withSuspense;