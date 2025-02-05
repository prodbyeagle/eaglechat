import { TWITCH_CLIENT_ID, TWITCH_TOKEN } from './Config';

export class Twitch {
	private static token: string | null = null;
	private static tokenExpiresAt: number | null = null;

	static async getAccessToken(): Promise<string> {
		if (
			Twitch.token &&
			Twitch.tokenExpiresAt &&
			Date.now() < Twitch.tokenExpiresAt
		) {
			return Twitch.token;
		}

		const tokenData = await Twitch.fetchAccessToken();
		Twitch.token = tokenData.access_token;
		Twitch.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

		return Twitch.token;
	}

	private static async fetchAccessToken(): Promise<{
		access_token: string;
		expires_in: number;
	}> {
		if (!TWITCH_CLIENT_ID || !TWITCH_TOKEN) {
			throw new Error(
				'TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be defined in env variables'
			);
		}

		const res = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: TWITCH_CLIENT_ID,
				client_secret: TWITCH_TOKEN,
				grant_type: 'client_credentials',
			}),
		});

		if (!res.ok) {
			throw new Error(
				`Failed to get Twitch access token: ${res.status} ${res.statusText}`
			);
		}

		return res.json();
	}

	static async getBroadcasterId(username: string): Promise<string> {
		console.log(`Fetching broadcaster ID for username: ${username}`);
		const token = await Twitch.getAccessToken();
		console.log(`Access token retrieved: ${token}`);

		const res = await fetch(
			`https://api.twitch.tv/helix/users?login=${username}`,
			{
				method: 'GET',
				headers: {
					'Client-ID': TWITCH_CLIENT_ID,
					Authorization: `Bearer ${token}`,
				},
			}
		);

		if (!res.ok) {
			console.error(`Failed to fetch broadcaster ID: ${res.status} ${res.statusText}`);
			throw new Error(
				`Failed to fetch broadcaster ID: ${res.status} ${res.statusText}`
			);
		}

		const data = await res.json();
		console.log(`Response data: ${JSON.stringify(data)}`);
		if (!data?.data?.length) {
			console.error(`No broadcaster found for username: ${username}`);
			throw new Error(`No broadcaster found for username: ${username}`);
		}

		const broadcasterId = data.data[0].id;
		console.log(`Broadcaster ID for username ${username}: ${broadcasterId}`);
		return broadcasterId;
	}
}
