'use client';

import type {
	Message,
	STVEmote,
	TwitchBadgeSet,
	TwitchEmoteData,
} from '@/types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/badge';

import { BadgeProvider } from '@/lib/badge-provider';
import { ChatProvider } from '@/lib/chat-provider';
import { handleCommand } from '@/lib/command';
import { EmoteProvider } from '@/lib/emote-provider';

import { SevenTVProvider } from '@/providers/stv';

import { adjustColorBrightness } from '@/utils/colorUtils';
import { replaceEmotes } from '@/utils/emoteUtils';

const MAX_MESSAGES = 20;

export default function ChatPage() {
	const params = useParams() as { channel: string };
	const channel = params.channel;
	const [messages, setMessages] = useState<Message[]>([]);
	const [emotes, setEmotes] = useState<TwitchEmoteData | null>(null);
	const [STVGlobalEmotes, setSTVGlobalEmotes] = useState<STVEmote[] | null>(
		null
	);
	const [STVChannelEmotes, setSTVChannelEmotes] = useState<STVEmote[] | null>(
		null
	);
	const [badges, setBadges] = useState<{
		global: Record<string, TwitchBadgeSet>;
		channel: Record<string, TwitchBadgeSet>;
	} | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			if (!channel) return;
			const chat = new ChatProvider(channel);
			const emote = await EmoteProvider.create(channel);
			const badge = await BadgeProvider.create(channel);
			const sevenTV = new SevenTVProvider();

			try {
				const [badgesData, emoteData, stvGlobal, stvChannel] =
					await Promise.all([
						badge.fetchBadges(),
						emote.fetchEmotes(),
						sevenTV.fetchGlobalSTVEmotes(),
						sevenTV.getSTVChannelEmotes(channel),
					]);

				BadgeProvider.addCustomBadge(
					'prodbyeagle',
					'https://cdn.7tv.app/emote/01H5ET82KR000B4C7M34K6ZCTK/4x.avif'
				);
				BadgeProvider.addCustomBadge(
					'dwhincandi',
					'https://cdn.7tv.app/emote/01F6T920S80004B20PGM3Q1GQS/4x.avif'
				);

				setBadges(badgesData);
				setEmotes(emoteData);
				setSTVGlobalEmotes(stvGlobal);
				setSTVChannelEmotes(stvChannel);

				chat.connect();
				chat.onMessage((chatMessage) => {
					handleCommand(chatMessage.message);
					setMessages((prev) => {
						const next = [
							...prev,
							{
								username: chatMessage.username,
								displayName: chatMessage.displayName,
								message: chatMessage.message,
								color: chatMessage.color,
								badges: chatMessage.badges,
							},
						];
						return next.slice(-MAX_MESSAGES);
					});
				});
			} catch (error) {
				console.error('Fehler beim Abrufen der Daten:', error);
			}

			return () => chat.disconnect();
		};

		fetchData();
	}, [channel]);

	return (
		<div className='h-screen p-4 text-xl text-neutral-50 flex flex-col justify-end overflow-hidden'>
			<div className='space-y-1'>
				{messages.map((msg, idx) => (
					<div key={idx} className='flex items-center space-x-1'>
						<Badge
							username={msg.username}
							channel={channel}
							badges={
								Object.fromEntries(
									Object.entries(msg.badges).filter(
										([, value]) => value !== undefined
									)
								) as Record<string, string>
							}
							badgeData={badges}
						/>
						{msg.color && (
							<span
								className='font-semibold'
								style={{
									color: adjustColorBrightness(msg.color),
								}}>
								{msg.displayName}
							</span>
						)}
						<span className='inline-flex flex-wrap'>
							{replaceEmotes(
								msg.message,
								emotes,
								STVGlobalEmotes,
								STVChannelEmotes
							)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
