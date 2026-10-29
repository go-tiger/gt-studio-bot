import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { PingCommand } from './commands/ping.command.js';
import { ErrorEvent } from './events/error.event.js';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_TOKEN'),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.GuildMembers,
        ],
        development: ['1448950434113916930'],
      }),
    }),
  ],
  providers: [PingCommand, ErrorEvent],
})
export class DiscordModule {}
