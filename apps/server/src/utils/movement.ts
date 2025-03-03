import { Player } from "../types/Player";
import { UPDATE_INTERVAL, X_VELOCITY, Y_VELOCITY } from "../config/serverConfig";

export function processPlayerMovement(players: Record<string, Player>, playerInputs: any) {
  let updated = false;

  for (const id in players) {
    const player = players[id];
    const input = playerInputs[id];

    if (input) {
      if (input.seq > player.lastProcessedInput) {
        player.lastProcessedInput = input.seq;

        // Reset velocity
        player.velocity.x = 0;
        player.velocity.y = 0;

        // Update velocity based on input
        if (input.keys.d) player.velocity.x = X_VELOCITY;
        if (input.keys.a) player.velocity.x = -X_VELOCITY;
        if (input.keys.w) player.velocity.y = -Y_VELOCITY;
        if (input.keys.s) player.velocity.y = Y_VELOCITY;

        // Apply movement
        player.x += player.velocity.x * UPDATE_INTERVAL / 1000;
        player.y += player.velocity.y * UPDATE_INTERVAL / 1000;

        // Update animation state
        player.animationState = {
          direction: input.keys.d ? 'right' : input.keys.a ? 'left' : input.keys.w ? 'up' : 'down',
          moving: true
        };

        updated = true;
      } else if (player.animationState?.moving) {
        player.animationState.moving = false;
        updated = true;
      }
    }
  }

  return updated;
}