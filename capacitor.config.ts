import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.signlens.app',
  appName: 'SignLens',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
