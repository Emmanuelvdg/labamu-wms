import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-destructive/10 p-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Access Denied</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                        You don't have permission to access this resource.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        If you believe this is an error, please contact your system administrator
                        to request the necessary permissions.
                    </p>
                    <div className="pt-4">
                        <Link href="/">
                            <Button className="w-full">
                                <Home className="h-4 w-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
