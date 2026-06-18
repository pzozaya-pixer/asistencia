import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { MockAuthGuard } from "../common/mock-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @UseGuards(MockAuthGuard)
  @Get("me")
  me() {
    return this.authService.me();
  }
}

