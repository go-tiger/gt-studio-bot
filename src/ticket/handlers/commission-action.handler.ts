import { Injectable } from '@nestjs/common';
import { Button, Context, Modal, StringSelect } from 'necord';
import type { ButtonContext, ModalContext, StringSelectContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { TicketService } from '../ticket.service.js';
import { TicketStatus, TicketStatusLabel } from '../../core/entities/index.js';
import { buildTicketEmbed } from '../ticket-embed.js';

@Injectable()
export class CommissionActionHandler {
  constructor(private readonly ticketService: TicketService) {}

  @Button('commission_status')
  async onStatusButton(@Context() [interaction]: ButtonContext) {
    // Check if user has admin role
    const settings = await this.ticketService.getOrCreateGuildSettings(interaction.guildId!);
    if (!interaction.member || !('roles' in interaction.member)) {
      return interaction.reply({
        content: '권한이 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRoles = interaction.member.roles;
    const hasAdminRole = Array.isArray(memberRoles)
      ? memberRoles.includes(settings.adminRole)
      : memberRoles.cache.has(settings.adminRole);

    if (!hasAdminRole) {
      return interaction.reply({
        content: '관리자만 상태를 변경할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const statusSelect = new StringSelectMenuBuilder()
      .setCustomId('select_commission_status')
      .setPlaceholder('새로운 상태 선택')
      .addOptions(
        Object.values(TicketStatus).map(status => ({
          label: TicketStatusLabel[status],
          value: status,
        }))
      );

    await interaction.reply({
      content: '변경할 상태를 선택해주세요:',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statusSelect),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  @StringSelect('select_commission_status')
  async onSelectStatus(@Context() [interaction]: StringSelectContext) {
    const newStatus = interaction.values[0] as TicketStatus;
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId!);

    if (!ticket) {
      return interaction.reply({
        content: '의뢰 정보를 찾을 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.ticketService.updateTicketStatus(ticket.id, newStatus);

    // Update the original embed
    await this.updateTicketEmbed(interaction, ticket.id);

    // Ephemeral response to admin
    await interaction.reply({
      content: `✅ 상태가 **${TicketStatusLabel[newStatus]}**(으)로 변경되었습니다.`,
      flags: MessageFlags.Ephemeral,
    });

    // Public notification to requester
    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({
        content: `<@${ticket.requester}> 의뢰 상태가 **${TicketStatusLabel[newStatus]}**(으)로 변경되었습니다.`,
      });
    }

    // Move to archive category if status is COMPLETED
    if (newStatus === TicketStatus.COMPLETED && interaction.guildId) {
      const settings = await this.ticketService.getOrCreateGuildSettings(interaction.guildId);
      if (settings.archive && interaction.channel && 'setParent' in interaction.channel) {
        // lockPermissions: false to keep existing permissions (requester can still chat)
        await interaction.channel.setParent(settings.archive, { lockPermissions: false }).catch(() => {});
      }
    }
  }

  @Button('commission_price')
  async onPriceButton(@Context() [interaction]: ButtonContext) {
    // Check if user has admin role
    const settings = await this.ticketService.getOrCreateGuildSettings(interaction.guildId!);
    if (!interaction.member || !('roles' in interaction.member)) {
      return interaction.reply({
        content: '권한이 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRoles = interaction.member.roles;
    const hasAdminRole = Array.isArray(memberRoles)
      ? memberRoles.includes(settings.adminRole)
      : memberRoles.cache.has(settings.adminRole);

    if (!hasAdminRole) {
      return interaction.reply({
        content: '관리자만 가격을 설정할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('commission_price_modal')
      .setTitle('가격 설정');

    const priceInput = new TextInputBuilder()
      .setCustomId('price_input')
      .setLabel('가격 (원)')
      .setPlaceholder('예: 10000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput)
    );

    await interaction.showModal(modal);
  }

  @Modal('commission_price_modal')
  async onPriceModal(@Context() [interaction]: ModalContext) {
    const priceStr = interaction.fields.getTextInputValue('price_input');
    const price = parseInt(priceStr, 10);

    if (isNaN(price) || price < 0) {
      return interaction.reply({
        content: '올바른 가격을 입력해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId!);

    if (!ticket) {
      return interaction.reply({
        content: '의뢰 정보를 찾을 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.ticketService.updateTicketPrice(ticket.id, price);

    // Update the original embed
    await this.updateTicketEmbed(interaction, ticket.id);

    // Ephemeral response to admin
    await interaction.reply({
      content: `✅ 가격이 **${price.toLocaleString()}원**으로 설정되었습니다.`,
      flags: MessageFlags.Ephemeral,
    });

    // Public notification to requester
    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({
        content: `<@${ticket.requester}> 의뢰 가격이 **${price.toLocaleString()}원**으로 설정되었습니다.`,
      });
    }
  }

  @Button('commission_close')
  async onCloseButton(@Context() [interaction]: ButtonContext) {
    // Check if user has admin role
    const settings = await this.ticketService.getOrCreateGuildSettings(interaction.guildId!);
    if (!interaction.member || !('roles' in interaction.member)) {
      return interaction.reply({
        content: '권한이 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRoles = interaction.member.roles;
    const hasAdminRole = Array.isArray(memberRoles)
      ? memberRoles.includes(settings.adminRole)
      : memberRoles.cache.has(settings.adminRole);

    if (!hasAdminRole) {
      return interaction.reply({
        content: '관리자만 티켓을 닫을 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('commission_close_confirm')
        .setLabel('확인')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('commission_close_cancel')
        .setLabel('취소')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: '⚠️ 정말로 이 티켓을 닫으시겠습니까? 채널이 삭제됩니다.',
      components: [confirmRow],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button('commission_close_confirm')
  async onCloseConfirm(@Context() [interaction]: ButtonContext) {
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId!);

    if (ticket) {
      await this.ticketService.updateTicketStatus(ticket.id, TicketStatus.COMPLETED);
    }

    await interaction.reply({
      content: '🔒 티켓을 닫는 중...',
      flags: MessageFlags.Ephemeral,
    });

    // Delete the channel after a short delay
    setTimeout(async () => {
      try {
        await interaction.channel?.delete();
      } catch (error) {
        console.error('Failed to delete channel:', error);
      }
    }, 2000);
  }

  @Button('commission_close_cancel')
  async onCloseCancel(@Context() [interaction]: ButtonContext) {
    await interaction.update({
      content: '티켓 닫기가 취소되었습니다.',
      components: [],
    });
  }

  private async updateTicketEmbed(interaction: any, ticketId: number) {
    const ticket = await this.ticketService.getTicketById(ticketId);
    if (!ticket) return;

    const launcher = await this.ticketService.getTicketLauncherByTicketId(ticketId);
    if (!launcher) return;

    // Find and update the original message with the embed
    const channel = interaction.channel;
    if (!channel || !('messages' in channel)) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessage = messages.find(
      (m: any) => m.author.id === interaction.client.user?.id && m.embeds.length > 0
    );

    if (!botMessage) return;

    const embed = buildTicketEmbed(ticket, launcher);

    await botMessage.edit({ embeds: [embed] });
  }
}
