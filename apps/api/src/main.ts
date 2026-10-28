import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonLogger } from './common/json.logger';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  if (config.get<string>('NODE_ENV') === 'production') {
    app.useLogger(new JsonLogger());
  }
  setupSwagger(app);
  await app.listen(config.get<number>('PORT', 3000));
}
void bootstrap();
