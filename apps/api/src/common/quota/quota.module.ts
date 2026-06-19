import { Global, Module } from '@nestjs/common';
import { QuotaService } from './quota.service';

@Global()
@Module({
    providers: [QuotaService],
    exports: [QuotaService],
})
export class QuotaModule {}
