import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { join } from "path";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    // Static serve for generated PDFs
    app.use("/static", express.static(join(process.cwd(), "generated")));

    const port = process.env.PORT || 4000;

    // Enable graceful shutdown
    app.enableShutdownHooks();

    await app.listen(port);
    console.log(`API running on http://localhost:${port}`);

    // Handle termination signals
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
}

bootstrap().catch(err => {
    console.error('Failed to start the application:', err);
    process.exit(1);
});

