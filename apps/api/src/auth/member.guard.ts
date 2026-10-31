import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { verifyBearer } from './bearer-token';

type MemberRequest = Request & { memberId: number };

@Injectable()
export class MemberGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MemberRequest>();
    const { sub } = await verifyBearer(this.jwt, request, 'member');
    request.memberId = Number(sub);
    return true;
  }
}

export const CurrentMemberId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number =>
    context.switchToHttp().getRequest<MemberRequest>().memberId,
);
