import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as fs from "fs";

async function bootstrap() {
  console.log("MAIN START: Initializing Nest");
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

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

  const config = new DocumentBuilder()
    .setTitle("CleanSlice MCP Server")
    .setVersion("1.0")
    .addTag("api")
    .addTag("mcp")
    .addServer("/")
    .build();
  const document = SwaggerModule.createDocument(app, config);
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

  if (process.env.NODE_ENV === "dev") {
    fs.writeFileSync("./swagger-spec.json", JSON.stringify(document));
  }

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
