import { Controller, Get } from "@nestjs/common";
import { success } from "@polyand/shared";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return success({ ok: true });
  }
}

