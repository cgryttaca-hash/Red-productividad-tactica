function createDeviceSender({ messaging, webPush, settings }) {
  return async (device, payload, { urgency = 'normal', ttl = 3600 } = {}) => {
    if (device.transport === 'fcm' && device.fcmToken) {
      const data = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]));
      while (Buffer.byteLength(JSON.stringify(data), 'utf8') > 3800 && data.body.length > 80) data.body = `${data.body.slice(0, -41)}…`;
      const messageId = await messaging.send({ token: device.fcmToken, data, webpush: { headers: { TTL: String(ttl), Urgency: urgency } } });
      return { messageId };
    }
    return webPush.sendNotification(device.subscription, JSON.stringify(payload), { TTL: ttl, urgency, timeout: 10000, vapidDetails: { subject: settings.contact, publicKey: settings.publicKey, privateKey: settings.privateKey } });
  };
}

module.exports = { createDeviceSender };
