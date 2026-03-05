import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pedropiedade.zenithapp',
  appName: 'Zenith',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '471890064632-6pehr2hlbfudc3qbf0je5kjpd2bjavlv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
