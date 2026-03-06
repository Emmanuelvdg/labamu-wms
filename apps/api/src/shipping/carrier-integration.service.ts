import { Injectable, Logger } from '@nestjs/common';

export interface ShippingRate {
    carrierName: string;
    serviceLevel: string;
    cost: number;
    currency: string;
    estimatedDays: number;
}

@Injectable()
export class CarrierIntegrationService {
    private readonly logger = new Logger(CarrierIntegrationService.name);

    /**
     * Simulated integration with multiple carriers (USPS, FedEx, UPS)
     */
    async getRates(originZip: string, destZip: string, weightKg: number): Promise<ShippingRate[]> {
        this.logger.log(`Fetching rates for shipment from ${originZip} to ${destZip}, weight: ${weightKg}kg`);

        // Mock 3rd party API call delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const rates: ShippingRate[] = [];

        // USPS Mock
        if (weightKg < 2) {
            rates.push({ carrierName: 'USPS', serviceLevel: 'First-Class', cost: 5.50 + (weightKg * 2), currency: 'USD', estimatedDays: 3 });
        }
        rates.push({ carrierName: 'USPS', serviceLevel: 'Priority', cost: 8.50 + (weightKg * 3), currency: 'USD', estimatedDays: 2 });

        // FedEx Mock
        rates.push({ carrierName: 'FedEx', serviceLevel: 'Ground', cost: 12.00 + (weightKg * 1.5), currency: 'USD', estimatedDays: 4 });
        rates.push({ carrierName: 'FedEx', serviceLevel: '2Day', cost: 25.00 + (weightKg * 2), currency: 'USD', estimatedDays: 2 });
        rates.push({ carrierName: 'FedEx', serviceLevel: 'Standard Overnight', cost: 45.00 + (weightKg * 2.5), currency: 'USD', estimatedDays: 1 });

        // UPS Mock
        rates.push({ carrierName: 'UPS', serviceLevel: 'Ground', cost: 11.50 + (weightKg * 1.6), currency: 'USD', estimatedDays: 4 });
        rates.push({ carrierName: 'UPS', serviceLevel: 'Next Day Air', cost: 48.00 + (weightKg * 3), currency: 'USD', estimatedDays: 1 });

        // Sort by cost ascending
        return rates.sort((a, b) => a.cost - b.cost);
    }
}
