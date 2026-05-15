'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Keyboard, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { playScanSound } from '@/lib/soundUtils';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    playSoundOnScan?: boolean;
}

export function BarcodeScanner({ onScan, placeholder = "Scan barcode...", autoFocus = true, playSoundOnScan = true }: BarcodeScannerProps) {
    const [mode, setMode] = useState<'HID' | 'CAMERA'>('HID');
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Keep input focused if in HID mode
    useEffect(() => {
        if (mode === 'HID' && autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [mode, autoFocus]);

    useEffect(() => {
        const handleClickOutside = () => {
            if (mode === 'HID' && autoFocus && inputRef.current) {
                inputRef.current.focus();
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [mode, autoFocus]);

    // Handle Camera initialization
    useEffect(() => {
        if (mode === 'CAMERA') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 }, formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.QR_CODE] },
                /* verbose= */ false
            );
            scannerRef.current = scanner;

            scanner.render(
                (decodedText) => {
                    handleSuccessfulScan(decodedText);
                    // Optionally pause or stop here
                    scanner.pause(true);
                    setTimeout(() => scanner.resume(), 1500); // Resume after 1.5s
                },
                (errorMessage) => {
                    // Ignore typical scan errors (noise)
                }
            );

            return () => {
                scanner.clear().catch(console.error);
                scannerRef.current = null;
            };
        }
    }, [mode]);

    const handleSuccessfulScan = (code: string) => {
        if (!code.trim()) return;
        if (playSoundOnScan) playScanSound(true);
        onScan(code.trim());
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSuccessfulScan(inputValue);
        }
    };

    return (
        <div className="w-full flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-gray-100 p-1 rounded-lg">
                <Button
                    variant={mode === 'HID' ? 'default' : 'ghost'}
                    className="flex-1"
                    onClick={() => setMode('HID')}
                >
                    <Keyboard className="w-4 h-4 mr-2" />
                    Handheld Scanner
                </Button>
                <Button
                    variant={mode === 'CAMERA' ? 'default' : 'ghost'}
                    className="flex-1"
                    onClick={() => setMode('CAMERA')}
                >
                    <Camera className="w-4 h-4 mr-2" />
                    Device Camera
                </Button>
            </div>

            {mode === 'HID' ? (
                <div className="relative">
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="h-14 text-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-mono shadow-sm focus-visible:ring-emerald-500"
                    />
                    <div className="absolute right-3 top-4 text-xs text-emerald-600 font-semibold uppercase opacity-70">
                        Listening...
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                    <div id="reader" className="w-full"></div>
                </div>
            )}
        </div>
    );
}
