import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { readLastKnownLocation, storeLastKnownLocation } from '../../utils/locationCache';

interface SpeedContextType {
    currentSpeed: number | null;
    setCurrentSpeed: (speed: number | null) => void;
}

const SpeedContext = createContext<SpeedContextType | undefined>(undefined);

export const SpeedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSpeed, setCurrentSpeedInternal] = useState<number | null>(null);

    // Load initial speed from cache
    useEffect(() => {
        const loadInitialSpeed = async () => {
            const lastLocation = await readLastKnownLocation();
            if (lastLocation && lastLocation.speed !== null) {
                setCurrentSpeedInternal(lastLocation.speed);
            }
        };
        loadInitialSpeed();
    }, []);

    const setCurrentSpeed = useCallback(async (speed: number | null) => {
        setCurrentSpeedInternal(speed);
        
        // Persist to cache so background/other parts can see it
        // We only update the speed part of the cache here
        const lastLocation = await readLastKnownLocation();
        if (lastLocation) {
            await storeLastKnownLocation({
                ...lastLocation,
                speed
            });
        } else {
            // No last location known yet, store just speed with dummy coords if absolutely needed,
            // but usually it's better to wait for first location fix.
            // For now, if no location, we just store speed at 0,0
            await storeLastKnownLocation({
                latitude: 0,
                longitude: 0,
                speed
            });
        }
    }, []);

    return (
        <SpeedContext.Provider value={{ currentSpeed, setCurrentSpeed }}>
            {children}
        </SpeedContext.Provider>
    );
};

export const useSpeed = () => {
    const context = useContext(SpeedContext);
    if (context === undefined) {
        throw new Error('useSpeed must be used within a SpeedProvider');
    }
    return context;
};
