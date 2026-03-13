"use server";

import { channelService } from "./channel-service";
import { validateChannelForm } from "./validation";
import type { ChannelFormInput, Channel } from "./types";

export async function addChannelAction(
  input: ChannelFormInput,
): Promise<
  | { success: true; channel: Channel }
  | { success: false; errors: Record<string, string> }
> {
  const validation = validateChannelForm(input);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  if (channelService.isDuplicate(input.url)) {
    return { success: false, errors: { url: "이미 등록된 채널 URL입니다." } };
  }

  const channel = channelService.addChannel(input);
  return { success: true, channel };
}

export async function deleteChannelAction(id: string): Promise<boolean> {
  return channelService.deleteChannel(id);
}
