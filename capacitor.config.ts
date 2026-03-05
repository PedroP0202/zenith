import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pedropiedade.zenithapp',
  appName: 'Zenith',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      iosClientId: '471890064632-giqv86u4n6t9upor1kf5eulnaiggebrt.apps.googleusercontent.com',
      serverClientId: '471890064632-6pehr2hlbfudc3qbf0je5kjpd2bjavlv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
