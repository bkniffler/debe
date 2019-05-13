import { IAGServer } from 'debe-socket-server';

export function addFilterMiddleware(server: IAGServer) {
  server.setMiddleware(server.MIDDLEWARE_OUTBOUND, async middlewareStream => {
    for await (let action of middlewareStream) {
      // Don't publish back to origin socket
      if (action.type === action.PUBLISH_OUT) {
        let [origin, ...data] = action.data;
        if (origin === action.socket.id) {
          action.block();
          continue;
        }
        action.data = data;
      }

      action.allow();
    }
  });
}
