import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ metric: string }> }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || '7d';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Extract user_id from cookies for x-user-id header
        const userId = request.cookies.get('user_id')?.value || '';

        const queryParams = new URLSearchParams();
        queryParams.append('period', period);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        // Await params for Next.js 15 compatibility
        const params = await props.params;

        const response = await fetch(
            `${API_URL}/reporting/analytics/drilldown/${params.metric}?${queryParams}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': request.headers.get('cookie') || '',
                    'x-user-id': userId,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch drill-down data' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Drill-down API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
