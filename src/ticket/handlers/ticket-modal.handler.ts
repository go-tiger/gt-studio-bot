import { Injectable } from '@nestjs/common';
import { Context, Modal } from 'necord';
import type { ModalContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { TicketService } from '../ticket.service.js';
import { ModLoader } from '../../core/entities/index.js';
import { buildTicketEmbed } from '../ticket-embed.js';

const DEADLINE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class TicketModalHandler {
  constructor(private readonly ticketService: TicketService) {}

  @Modal('ticket_modal')
  async onTicketModal(@Context() [interaction]: ModalContext) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '오류가 발생했습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Get stored selection from service
    const userData = this.ticketService.getUserSelection(interaction.user.id);

    if (!userData?.mcVersion || !userData?.modLoader || !userData?.loaderVersion) {
      return interaction.reply({
        content: '오류가 발생했습니다. 다시 시도해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const mcVersion = userData.mcVersion;
    const modLoader = userData.modLoader as ModLoader;
    const loaderVersion = userData.loaderVersion;
    const interactionToken = userData.interactionToken;
    const applicationId = userData.applicationId;

    const launcherName = interaction.fields.getTextInputValue('launcher_name');
    const folderName = interaction.fields.getTextInputValue('folder_name');
    const additionalNotes = interaction.fields.getTextInputValue('additional_notes');
    const launcherType = interaction.fields.getStringSelectValues('launcher_type')[0];
    const deadlineInput = interaction.fields.getTextInputValue('deadline').trim();

    if (!DEADLINE_DATE_PATTERN.test(deadlineInput)) {
      return interaction.reply({
        content: '기한 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요. (예: 2026-08-15)',
        flags: MessageFlags.Ephemeral,
      });
    }

    const deadline = new Date(`${deadlineInput}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(deadline.getTime()) || deadline < today) {
      return interaction.reply({
        content: '기한이 올바르지 않습니다. 오늘 이후의 날짜를 YYYY-MM-DD 형식으로 입력해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Clear user selection
    this.ticketService.clearUserSelection(interaction.user.id);

    // Delete the selection message
    if (interactionToken && applicationId) {
      interaction.client.rest
        .delete(`/webhooks/${applicationId}/${interactionToken}/messages/@original`)
        .catch(() => {});
    }

    // Get guild settings
    const settings = await this.ticketService.getOrCreateGuildSettings(interaction.guild.id);

    if (!settings.ticket || !settings.adminRole) {
      return interaction.reply({
        content: '티켓 시스템이 설정되지 않았습니다. 관리자에게 문의해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create ticket + launcher spec in the database first (id needed for channel naming)
    const ticket = await this.ticketService.createLauncherTicket({
      guild: interaction.guild.id,
      requester: interaction.user.id,
      note: additionalNotes || undefined,
      launcherName,
      folderName,
      minecraftVersion: mcVersion,
      modLoader,
      loaderVersion,
      launcherType,
      deadline,
    });

    const ticketName = `ticket-${interaction.user.username}-${String(ticket.id).padStart(3, '0')}`;

    // Create ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: settings.ticket,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: settings.adminRole,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    });

    await this.ticketService.setTicketChannel(ticket.id, ticketChannel.id);

    const launcher = await this.ticketService.getTicketLauncherByTicketId(ticket.id);
    const embed = buildTicketEmbed(ticket, launcher!);

    // Admin action buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('commission_status')
        .setLabel('상태 변경')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋'),
      new ButtonBuilder()
        .setCustomId('commission_price')
        .setLabel('가격 설정')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💰'),
      new ButtonBuilder()
        .setCustomId('commission_close')
        .setLabel('티켓 닫기')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
    );

    // Send welcome message in ticket channel
    await ticketChannel.send({
      content: `<@${interaction.user.id}> <@&${settings.adminRole}>`,
      embeds: [embed],
      components: [actionRow],
    });

    // Reply and delete after 3 seconds
    await interaction.reply({
      content: `✅ 티켓이 생성되었습니다! <#${ticketChannel.id}>`,
      flags: MessageFlags.Ephemeral,
    });

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 3000);
  }
}
