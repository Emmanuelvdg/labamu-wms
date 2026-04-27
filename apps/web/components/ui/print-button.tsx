import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
    endpoint: string,
    label?: string
}

export function PrintButton({ endpoint, label = "Print Label" }: PrintButtonProps) {
    const handlePrint = async () => {
        try {
            // Route through the Next.js /api rewrite proxy to avoid CORS and hardcoded URLs
            const url = `/api${endpoint}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error(error);
            alert("Failed to initiate print");
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            {label}
        </Button>
    )
}
