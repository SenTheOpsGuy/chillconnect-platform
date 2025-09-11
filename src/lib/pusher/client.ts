import Pusher from 'pusher-js';

let pusher: Pusher | null = null;

export const getPusherInstance = () => {
  if (!pusher) {
    pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
      forceTLS: true
    });
  }
  return pusher;
};

export const subscribeToChatChannel = (bookingId: string) => {
  const pusherInstance = getPusherInstance();
  return pusherInstance.subscribe(`booking-${bookingId}`);
};

export const unsubscribeFromChatChannel = (bookingId: string) => {
  const pusherInstance = getPusherInstance();
  pusherInstance.unsubscribe(`booking-${bookingId}`);
};

export default getPusherInstance;