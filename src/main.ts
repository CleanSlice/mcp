import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./slices/setup/swagger";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";

async function bootstrap() {
  const isDev = process.env.NODE_ENV === "dev";

  const app = await NestFactory.create(AppModule, {
    logger: isDev ? ["log", "warn", "error", "debug", "verbose"] : ["log", "warn", "error"],
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    })
  );

  // Served, not written. `swagger-spec.json` is tracked in git and is produced
  // by `npm run swagger:generate` - writing it here modified a tracked file
  // every time anyone started the server in dev.
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      url: "/api.json",
    },
  });

  app.use("/api.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(document);
  });

  const port = process.env.PORT ?? 8080;
  console.log(`Listening on port ${port}`);
  await app.listen(port);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

bootstrap();
