import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "./shared/http-error.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>("CORS_ORIGIN") ?? "http://localhost:5173";

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || corsOrigin.includes("*") || corsOrigin.split(",").includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    }
  });
  app.useGlobalFilters(new HttpErrorFilter());
  app.setGlobalPrefix("api/v1");

  await app.listen(config.get<number>("PORT") ?? 3000);
}

void bootstrap();
