import { redirect } from 'next/navigation';

export default function LegacyWarehouseFloorPlanPage({
    params
}: {
    params: { id: string }
}) {
    redirect(`/floor-plan?warehouseId=${params.id}`);
}
