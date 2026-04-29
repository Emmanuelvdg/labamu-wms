import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SupplierAuthGuard extends AuthGuard('jwt-supplier') { }
