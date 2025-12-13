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

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
        // Only left click
        if (e.button !== 0) return;

        // Prevent default browser text selection
        e.preventDefault();

        interactionRef.current = { startY: e.clientY, startVal: value, hasMoved: false };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (!interactionRef.current) return;

        const deltaY = interactionRef.current.startY - e.clientY;

        // Threshold to start dragging (avoid accidental drags on clicks)
        if (!interactionRef.current.hasMoved && Math.abs(deltaY) < 5) return;

        if (!interactionRef.current.hasMoved) {
            interactionRef.current.hasMoved = true;
            setIsDragging(true);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        }

        e.preventDefault();

        // Sensitivity: 5 pixels per step
        const steps = Math.round(deltaY / 5);
        const newValue = Math.max(min, Math.min(max, interactionRef.current.startVal + (steps * step)));

        onChange(newValue);
    }, [min, max, onChange, step]);

    const handleMouseUp = React.useCallback(() => {
        // If we didn't move, treat it as a click -> Focus and Select All
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

    // Clean up listeners if component unmounts while dragging
    React.useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div className={`form-control w-full ${className}`}>
            <div className="label pb-1">
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
                className={`input input-sm input-bordered w-full font-mono ${isDragging ? 'cursor-ns-resize' : 'cursor-text'}`}
            />
        </div>
    );
};
