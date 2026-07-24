import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'tw.maohai.lifecenter',
  appName: '毛孩生活中心',
  webDir: 'dist',
  backgroundColor: '#f7fbf9',
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_paw', iconColor: '#1c7e73', presentationOptions: ['badge', 'sound', 'banner', 'list'] } },
}

export default config
