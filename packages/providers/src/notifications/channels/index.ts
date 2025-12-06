export const notificationChannels = {
  email: {
    send: (payload: any) => console.log('Sending email:', payload),
  },
  whatsapp: {
    send: (payload: any) => console.log('Sending whatsapp:', payload),
  },
  sms: {
    send: (payload: any) => console.log('Sending sms:', payload),
  },
  push: {
    send: (payload: any) => console.log('Sending push:', payload),
  },
  inApp: {
    send: (payload: any) => console.log('Sending in-app:', payload),
  },
};