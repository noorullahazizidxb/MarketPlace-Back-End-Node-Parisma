import { io } from 'socket.io-client';
import dotenv from 'dotenv';
dotenv.config();

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL || `http://localhost:${process.env.PORT || 4000}`;
const TOKEN = process.env.TOKEN || process.env.TOKEN_SECRET || '';

console.log('Connecting to', WS_URL, 'with token present?', !!TOKEN);

const socket = io(WS_URL, {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token: TOKEN }
});

socket.on('connect', () => {
  console.log('socket connected:', socket.id);
  try {
    console.log('rooms:', Array.from(socket.rooms));
  } catch (e) {}
});

socket.on('disconnect', (reason) => console.log('socket disconnected:', reason));
socket.on('connect_error', (err) => console.error('connect_error:', err.message));

const events = ['blogCreated','blogUpdated','newComment','newLike','newShare','storyCreated','storyUpdated','storyDeleted','notification:new'];
for (const ev of events) {
  socket.on(ev, (payload) => {
    console.log('\n== EVENT', ev, '==');
    try { console.log(JSON.stringify(payload, null, 2)); } catch (e) { console.log(payload); }
  });
}

process.on('SIGINT', () => {
  console.log('closing socket');
  socket.close();
  process.exit(0);
});
