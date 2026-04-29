import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { FeatureFlagGuard, RequireFlag } from '../common/guards/feature-flag.guard';

@UseGuards(FeatureFlagGuard)
@RequireFlag('MULTI_CURRENCY')
@Controller('currencies')
export class CurrencyController {
    constructor(private readonly currencyService: CurrencyService) {}

    @Get()
    listCurrencies() {
        return this.currencyService.listCurrencies();
    }

    @Post()
    createCurrency(@Body() data: { code: string; name: string; symbol: string; isBase?: boolean; enabled?: boolean }) {
        return this.currencyService.createCurrency(data);
    }

    @Put(':code')
    updateCurrency(@Param('code') code: string, @Body() data: any) {
        return this.currencyService.updateCurrency(code, data);
    }

    @Delete(':code')
    deleteCurrency(@Param('code') code: string) {
        return this.currencyService.deleteCurrency(code);
    }

    @Get('rates')
    listRates() {
        return this.currencyService.listRates();
    }

    @Post('rates')
    setRate(@Body() data: { fromCode: string; toCode: string; rate: number }) {
        return this.currencyService.setRate(data.fromCode, data.toCode, data.rate);
    }

    @Post('sync')
    syncRates() {
        return this.currencyService.triggerSync();
    }
}
