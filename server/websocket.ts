import { WebSocket } from 'ws';

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  playerName: string;
  seed: string;
  distance: number;
}

export class GhostRelayService {
  private clients = new Map<string, ConnectedClient>();

  public handleConnection(ws: WebSocket) {
    const clientId = `pilot_${Math.random().toString(36).substring(2, 9)}`;

    const client: ConnectedClient = {
      id: clientId,
      ws,
      playerName: 'Cadet Pilot',
      seed: 'SEED-DAILY-GAUNTLET',
      distance: 0,
    };
    this.clients.set(clientId, client);

    // Send welcome message safely
    try {
      ws.send(
        JSON.stringify({
          type: 'connected',
          clientId,
          activePilots: this.clients.size,
        }),
        (err) => {
          if (err) this.clients.delete(clientId);
        }
      );
    } catch {
      this.clients.delete(clientId);
    }

    ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'join') {
          client.playerName = msg.playerName || client.playerName;
          client.seed = msg.seed || client.seed;
          this.broadcastPeerCount();
        } else if (msg.type === 'telemetry_heartbeat') {
          client.distance = msg.distance || client.distance;

          // Milestone broadcast (e.g. every 1,000m)
          if (client.distance > 0 && client.distance % 1000 < 50) {
            this.broadcastMilestone(client.playerName, Math.floor(client.distance));
          }
        }
      } catch {
        // Ignore malformed payloads
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.broadcastPeerCount();
    });

    ws.on('error', () => {
      this.clients.delete(clientId);
    });
  }

  private broadcastPeerCount() {
    const payload = JSON.stringify({
      type: 'pilot_count',
      count: this.clients.size,
    });
    for (const c of this.clients.values()) {
      if (c.ws.readyState === WebSocket.OPEN) {
        try {
          c.ws.send(payload, (err) => {
            if (err) {
              this.clients.delete(c.id);
            }
          });
        } catch {
          this.clients.delete(c.id);
        }
      }
    }
  }

  private broadcastMilestone(playerName: string, distance: number) {
    const payload = JSON.stringify({
      type: 'milestone',
      message: `⚡ [${playerName}] has traversed ${distance.toLocaleString()}m!`,
      distance,
    });
    for (const c of this.clients.values()) {
      if (c.ws.readyState === WebSocket.OPEN) {
        try {
          c.ws.send(payload, (err) => {
            if (err) {
              this.clients.delete(c.id);
            }
          });
        } catch {
          this.clients.delete(c.id);
        }
      }
    }
  }
}

export const ghostRelay = new GhostRelayService();
