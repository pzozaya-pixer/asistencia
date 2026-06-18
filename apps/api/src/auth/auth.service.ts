import { Injectable } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  login(payload: LoginDto) {
    return {
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      user: {
        id: "usr-demo-1",
        role: "super_admin",
        email: payload.email,
        name: "Responsable Demo"
      }
    };
  }

  me() {
    return {
      id: "usr-demo-1",
      role: "super_admin",
      email: "responsable@demo.local"
    };
  }
}

