import { EmbedBuilder } from 'discord.js';
import { Ticket, TicketLauncher } from '../core/entities/index.js';

export function buildTicketEmbed(ticket: Ticket, launcher: TicketLauncher): EmbedBuilder {
  const deadline = new Date(launcher.deadline);

  const embed = new EmbedBuilder()
    .setTitle('📋 의뢰 정보')
    .setColor(0x5865F2)
    .addFields(
      { name: '의뢰자', value: `<@${ticket.requester}>`, inline: true },
      { name: '상태', value: ticket.status, inline: true },
      { name: '가격', value: ticket.price ? `${ticket.price.toLocaleString()}원` : '미정', inline: true },
      { name: '런처 이름', value: launcher.launcherName, inline: true },
      { name: '폴더명', value: launcher.folderName, inline: true },
      { name: '마인크래프트 버전', value: launcher.minecraftVersion, inline: true },
      { name: '모드로더', value: `${launcher.modLoader} ${launcher.loaderVersion}`, inline: true },
      { name: '런처 타입', value: launcher.launcherType ? `${launcher.launcherType} 타입` : '미정', inline: true },
      { name: '희망 기한', value: `<t:${Math.floor(deadline.getTime() / 1000)}:D>`, inline: true },
    )
    .setTimestamp();

  if (ticket.note) {
    embed.addFields({ name: '추가 요청사항', value: ticket.note });
  }

  return embed;
}
