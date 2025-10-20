import { useState, useEffect } from 'react';

interface RefreshStatus {
    lastRefresh: string;
    nextRefresh: string;
    timeUntilNextRefresh: number;
}

export function useRefreshStatus() {
    const [status, setStatus] = useState<RefreshStatus | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/refresh/status');
                if (!res.ok) throw new Error('Failed to fetch refresh status');
                const data = await res.json();
                setStatus(data);
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to fetch refresh status'));
            }
        };

        fetchStatus();
        // Update status every minute
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    return { status, error };
}