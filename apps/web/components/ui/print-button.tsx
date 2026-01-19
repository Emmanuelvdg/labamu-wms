import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
    endpoint: string,
    label?: string
}

export function PrintButton({ endpoint, label = "Print Label" }: PrintButtonProps) {
    const handlePrint = async () => {
        try {
            // Because our API is on port 3001, we need to make sure we hit the full URL or use the proxy.
            // Assuming proxy or direct call. If direct, needs CORS.
            // Simplest way is window.open if it's GET and downloads PDF.
            const url = `http://localhost:3001${endpoint}`;
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
