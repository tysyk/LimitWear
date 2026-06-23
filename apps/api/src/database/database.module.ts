import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { getDatabaseUrl } from './database.config';

const databaseLogger = new Logger('Database');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: getDatabaseUrl(configService),
        retryAttempts: 3,
        retryDelay: 1_000,
        serverSelectionTimeoutMS: 5_000,
        onConnectionCreate: (connection: Connection) => {
          connection.on('connected', () => {
            databaseLogger.log('MongoDB connection established');
          });
          connection.on('disconnected', () => {
            databaseLogger.warn('MongoDB connection lost');
          });
          connection.on('error', (error: Error) => {
            databaseLogger.error(`MongoDB connection error: ${error.message}`);
          });
        },
        connectionErrorFactory: (error: Error) => {
          databaseLogger.error(`Unable to connect to MongoDB: ${error.message}`);
          return error;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
