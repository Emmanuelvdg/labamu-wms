'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

interface DateRangeFilterProps {
    onFilterChange: (period: string, customRange?: { start: Date, end: Date }) => void;
}

export default function DateRangeFilter({ onFilterChange }: DateRangeFilterProps) {
    const [period, setPeriod] = useState('7d');

    const presets = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
        { label: 'Last 90 Days', value: '90d' },
    ];

    const handlePresetClick = (value: string) => {
        setPeriod(value);
        onFilterChange(value);
    };

    return (
        <div className="flex items-center space-x-2">
            {/* Preset Buttons */}
            <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                {presets.map(preset => (
                    <button
                        key={preset.value}
                        onClick={() => handlePresetClick(preset.value)}
                        className={`
                            px-4 py-2 text-sm font-medium rounded-md transition-colors
                            ${period === preset.value
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-gray-700 hover:bg-gray-100'
                            }
                        `}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
