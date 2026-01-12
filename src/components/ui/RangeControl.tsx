import React from 'react';

interface RangeControlProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    formatValue?: (value: number) => React.ReactNode;
    className?: string; // Additional classes for the wrapper
}

export const RangeControl: React.FC<RangeControlProps> = ({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    formatValue = (v) => v.toString(),
    className = '',
}) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    // Track interaction state to distinguish click vs drag without stale closures
    const interactionRef = React.useRef<{ startY: number; startVal: number; hasMoved: boolean } | null>(null);

    // Keep refs to props to ensure event handlers are stable and don't trigger cleanup
    const onChangeRef = React.useRef(onChange);
    const minRef = React.useRef(min);
    const maxRef = React.useRef(max);
    const stepRef = React.useRef(step);

    React.useLayoutEffect(() => {
        onChangeRef.current = onChange;
        minRef.current = min;
        maxRef.current = max;
        stepRef.current = step;
    });

    const handleDecrease = () => {
        const newValue = Math.max(min, value - step);
        onChange(newValue);
    };

    const handleIncrease = () => {
        const newValue = Math.min(max, value + step);
        onChange(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = Number(e.target.value);
        if (isNaN(newValue)) return;
        onChange(newValue);
    };

    const handleBlur = () => {
        const clamped = Math.max(min, Math.min(max, value));
        if (clamped !== value) {
            onChange(clamped);
        }
    };

    // Stable handlers for window events
    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;

        const deltaY = interactionRef.current.startY - e.clientY;
        if (!interactionRef.current.hasMoved && Math.abs(deltaY) < 5) return;

        if (!interactionRef.current.hasMoved) {
            interactionRef.current.hasMoved = true;
            setIsDragging(true);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        }

        e.preventDefault();

        const currentStep = stepRef.current;
        const currentMin = minRef.current;
        const currentMax = maxRef.current;

        const steps = Math.round(deltaY / 5);
        // Use logic relative to startVal
        let nextVal = interactionRef.current.startVal + (steps * currentStep);
        nextVal = Math.max(currentMin, Math.min(currentMax, nextVal));

        onChangeRef.current(nextVal);
    }, []);

    const handleMouseUp = React.useCallback(() => {
        if (interactionRef.current && !interactionRef.current.hasMoved) {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }
        interactionRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        interactionRef.current = { startY: e.clientY, startVal: value, hasMoved: false };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Cleanup ensures listeners are removed if component unmounts mid-drag
    // Because handlers are stable, this only runs on mount/unmount logic effectively
    React.useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div className={`form-control w-full ${className}`}>
            <div className="label">
                <span className="label-text text-sm font-medium">{label}</span>
            </div>
            <input
                ref={inputRef}
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onMouseDown={handleMouseDown}
                className={`input input-bordered w-full ${isDragging ? 'cursor-ns-resize' : 'cursor-text'}`}
            />
        </div>
    );
};
