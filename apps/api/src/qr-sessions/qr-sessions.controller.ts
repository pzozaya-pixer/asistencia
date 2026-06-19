import { Body, Controller, Post, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateQrSessionDto } from './dto/create-qr-session.dto';
import { QrSessionsService } from './qr-sessions.service';

type RequestWithMetadata = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

@Controller('qr-sessions')
export class QrSessionsController {
  constructor(private readonly qrSessionsService: QrSessionsService) {}

  @Post()
  @Roles(Role.SuperAdmin, Role.Responsable, Role.OperadorLectura)
  create(@Body() payload: CreateQrSessionDto, @Req() request: RequestWithMetadata) {
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader;

    return this.qrSessionsService.create(payload, {
      ipAddress: request.ip ?? null,
      device: userAgent ?? null,
    });
  }
}
