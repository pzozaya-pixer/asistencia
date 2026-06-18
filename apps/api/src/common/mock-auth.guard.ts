import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: "usr-demo-1",
      role: request.headers["x-demo-role"] ?? "super_admin",
      email: "responsable@demo.local"
    };
    return true;
  }
}

