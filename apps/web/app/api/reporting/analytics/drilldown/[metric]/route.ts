import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: { metric: string } }
) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || '7d';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const queryParams = new URLSearchParams();
        queryParams.append('period', period);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        const response = await fetch(
            `${API_URL}/reporting/analytics/drilldown/${params.metric}?${queryParams}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': request.headers.get('cookie') || '',
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
