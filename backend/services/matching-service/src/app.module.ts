import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig, ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { MatchingModule } from './matching/matching.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Scheduler Setup
    ScheduleModule.forRoot(), 

    // GraphQL Setup
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
      subscriptions: {
        'graphql-ws': true,
      }
    }),

    // Config Module
    ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    // Application Modules
    MatchingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
