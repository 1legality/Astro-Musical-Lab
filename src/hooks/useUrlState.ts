import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseUrlStateOptions<T extends Record<string, unknown>> {
    /** Default values for each key */
    defaults: T;
    /** Debounce delay in ms before updating the URL (default: 500) */
    debounceMs?: number;
    /** Keys to include in URL (if omitted, all keys are included) */
    keys?: (keyof T)[];
}

type StringifiableValue = string | number | boolean | null | undefined;

function isStringifiable(value: unknown): value is StringifiableValue {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        value === undefined
    );
}

/**
 * A hook to synchronize state with URL search parameters.
 * 
 * - Reads initial values from the URL on mount
 * - Updates URL when state changes (debounced)
 * - Returns whether the URL has been read (urlReady) to avoid re-reading
 * 
 * @returns [state, setState, urlReady]
 */
export function useUrlState<T extends Record<string, unknown>>(
    options: UseUrlStateOptions<T>
): [T, (updates: Partial<T>) => void, boolean] {
    const { defaults, debounceMs = 500, keys } = options;
    const [state, setStateInternal] = useState<T>(defaults);
    const [urlReady, setUrlReady] = useState(false);
    const debounceRef = useRef<number | null>(null);

    // Read from URL on mount
    useEffect(() => {
        if (typeof window === 'undefined') {
            setUrlReady(true);
            return;
        }

        const params = new URLSearchParams(window.location.search);
        if (!params.toString()) {
            setUrlReady(true);
            return;
        }

        setStateInternal((prev) => {
            const next = { ...prev };
            const keysToRead = keys ?? (Object.keys(defaults) as (keyof T)[]);

            for (const key of keysToRead) {
                const raw = params.get(String(key));
                if (raw === null) continue;

                const defaultVal = defaults[key];
                if (typeof defaultVal === 'number') {
                    const parsed = parseFloat(raw);
                    if (Number.isFinite(parsed)) {
                        (next as Record<string, unknown>)[String(key)] = parsed;
                    }
                } else if (typeof defaultVal === 'boolean') {
                    (next as Record<string, unknown>)[String(key)] = raw === 'true';
                } else {
                    // String or other - just assign the raw value
                    (next as Record<string, unknown>)[String(key)] = raw;
                }
            }
            return next;
        });

        setUrlReady(true);
    }, []);

    // Update URL when state changes (debounced)
    useEffect(() => {
        if (!urlReady || typeof window === 'undefined') return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            const params = new URLSearchParams();
            const keysToWrite = keys ?? (Object.keys(state) as (keyof T)[]);

            for (const key of keysToWrite) {
                const value = state[key];
                if (value === undefined || value === null) continue;
                if (!isStringifiable(value)) continue;

                const str = String(value).trim();
                if (str === '') continue;

                // Skip if same as default to keep URLs clean
                const defaultVal = defaults[key];
                if (String(defaultVal) === str) continue;

                params.set(String(key), str);
            }

            const query = params.toString();
            const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;

            try {
                window.history.replaceState({}, '', url);
            } catch {
                // Sandboxed environment
            }
        }, debounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [state, urlReady, debounceMs, keys]);

    const setState = useCallback((updates: Partial<T>) => {
        setStateInternal((prev) => ({ ...prev, ...updates }));
    }, []);

    return [state, setState, urlReady];
}
