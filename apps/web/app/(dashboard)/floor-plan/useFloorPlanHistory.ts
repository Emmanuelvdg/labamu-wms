import { useState, useCallback } from 'react';

export function useFloorPlanHistory<T>(initialState: T) {
    const [state, setState] = useState<{ history: T[]; pointer: number }>({
        history: [initialState],
        pointer: 0
    });

    const set = useCallback((newState: T | ((prev: T) => T)) => {
        setState(prev => {
            const currentVal = prev.history[prev.pointer];
            const nextState = typeof newState === 'function' 
                ? (newState as Function)(currentVal) 
                : newState;
            
            const newHistory = prev.history.slice(0, prev.pointer + 1);
            newHistory.push(nextState);
            
            return {
                history: newHistory,
                pointer: prev.pointer + 1
            };
        });
    }, []);

    const undo = useCallback(() => {
        setState(prev => ({
            ...prev,
            pointer: prev.pointer > 0 ? prev.pointer - 1 : prev.pointer
        }));
    }, []);

    const redo = useCallback(() => {
        setState(prev => ({
            ...prev,
            pointer: prev.pointer < prev.history.length - 1 ? prev.pointer + 1 : prev.pointer
        }));
    }, []);

    const canUndo = state.pointer > 0;
    const canRedo = state.pointer < state.history.length - 1;
    const current = state.history[state.pointer];

    return { 
        current, 
        set, 
        undo, 
        redo, 
        canUndo, 
        canRedo, 
        reset: (s: T) => setState({ history: [s], pointer: 0 }) 
    };
}
