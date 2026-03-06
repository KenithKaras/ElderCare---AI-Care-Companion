import { storageService, ConnectedDevice } from './storageService';
import { supabaseService } from './supabaseService';

// Keep a runtime map of device instances for reconnection
const activeDevices = new Map<string, any>();
let reconnectTimer: number | null = null;

export const bluetoothService = {
  /**
   * Checks if Web Bluetooth is supported and available.
   */
  isSupported(): boolean {
    return !!(navigator as any).bluetooth && window.isSecureContext;
  },

  /**
   * Attempts to get a list of devices already authorized by the user.
   */
  async getPairedDevices(): Promise<any[]> {
    if (!this.isSupported() || !(navigator as any).bluetooth.getDevices) return [];
    try {
      return await (navigator as any).bluetooth.getDevices();
    } catch (e) {
      console.warn("getDevices() not supported or failed", e);
      return [];
    }
  },

  /**
   * Connects to a real Bluetooth device using Broad Discovery.
   */
  async connectHeartRateDevice(existingDevice?: any): Promise<{ name: string; device: any; battery?: number } | null> {
    if (!window.isSecureContext) throw new Error('Bluetooth requires a secure connection (HTTPS).');
    if (!this.isSupported()) throw new Error('Web Bluetooth is not supported.');

    try {
      const hrServiceUuid = 'heart_rate';
      const batteryServiceUuid = 'battery_service';
      const deviceInfoServiceUuid = 'device_information';

      let device = existingDevice;
      if (!device) {
        device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [hrServiceUuid, batteryServiceUuid, deviceInfoServiceUuid]
        });
      }

      console.log(`Attempting GATT Connection: ${device.name || 'Unknown Device'}`);
      const server = await device.gatt?.connect();
      
      let hrCharacteristic = null;
      try {
        const hrService = await server?.getPrimaryService(hrServiceUuid);
        hrCharacteristic = await hrService?.getCharacteristic('heart_rate_measurement');
      } catch (e) {
        console.warn("Heart Rate service not found on this device.");
      }

      if (hrCharacteristic) {
        await hrCharacteristic.startNotifications();
        hrCharacteristic.addEventListener('characteristicvaluechanged', async (event: any) => {
          const value = event.target.value;
          const heartRate = this.parseHeartRate(value);
          
          // 1. Push to Cloud (Supabase)
          try {
            const result = await supabaseService.addVital({
              type: 'Heart Rate',
              value: heartRate.toString(),
              unit: 'bpm',
              timestamp: new Date().toISOString()
            });

            // 2. Dispatch the real DB object to the UI so it shows in trends and is deletable
            if (result && result[0]) {
              window.dispatchEvent(new CustomEvent('eca_vital_update', { detail: result[0] }));
            }
          } catch (cloudErr) {
            // Fallback to local if offline
            storageService.syncRealTimeVital('Heart Rate', heartRate.toString(), 'bpm');
          }
        });
      }

      activeDevices.set(device.id, device);

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection(device);
      });

      let batteryLevel = undefined;
      try {
        const battService = await server?.getPrimaryService(batteryServiceUuid);
        const battChar = await battService?.getCharacteristic('battery_level');
        const battVal = await battChar?.readValue();
        batteryLevel = battVal?.getUint8(0);
      } catch (e) {}

      const devices = storageService.getConnectedDevices();
      const updated = devices.map(d => d.id === device.id ? { ...d, status: 'Live' as const, lastSync: new Date().toISOString() } : d);
      storageService.saveConnectedDevices(updated);

      this.initAutoReconnect(); 

      return { name: device.name || 'Smart Watch', device, battery: batteryLevel };
    } catch (error: any) {
      if (!existingDevice && (error.name === 'NotFoundError' || error.message?.toLowerCase().includes('cancelled'))) {
        return null;
      }
      throw error;
    }
  },

  handleDisconnection(device: any) {
    storageService.addNotification({
      title: 'Watch Disconnected',
      message: `${device.name || 'Smart Watch'} lost connection.`,
      type: 'warning',
      category: 'health'
    });
    
    const devices = storageService.getConnectedDevices();
    const updated = devices.map(d => d.id === device.id ? { ...d, status: 'Disconnected' as const } : d);
    storageService.saveConnectedDevices(updated);
  },

  initAutoReconnect() {
    if (reconnectTimer) return;
    
    const settings = storageService.getSettings();
    if (!settings.autoReconnectEnabled) return;

    reconnectTimer = window.setInterval(async () => {
      const devices = storageService.getConnectedDevices();
      const settings = storageService.getSettings();
      
      const disconnectedDevices = devices.filter(d => d.isHardware && d.status === 'Disconnected');
      
      for (const d of disconnectedDevices) {
        try {
          const reUpdate = storageService.getConnectedDevices();
          storageService.saveConnectedDevices(reUpdate.map(dev => dev.id === d.id ? { ...dev, status: 'Reconnecting' as const } : dev));
          
          let deviceInstance = activeDevices.get(d.id);
          
          if (!deviceInstance) {
            const paired = await this.getPairedDevices();
            deviceInstance = paired.find(p => p.id === d.id);
          }

          if (deviceInstance) {
            await this.connectHeartRateDevice(deviceInstance);
          } else {
            const failUpdate = storageService.getConnectedDevices();
            storageService.saveConnectedDevices(failUpdate.map(dev => dev.id === d.id ? { ...dev, status: 'Disconnected' as const } : dev));
          }
        } catch (err) {
          const failUpdate = storageService.getConnectedDevices();
          storageService.saveConnectedDevices(failUpdate.map(dev => dev.id === d.id ? { ...dev, status: 'Disconnected' as const } : dev));
        }
      }
    }, settings.bluetoothRetryInterval * 1000);
  },

  stopAutoReconnect() {
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  },

  parseHeartRate(value: DataView): number {
    const flags = value.getUint8(0);
    const is16Bits = flags & 0x1;
    return is16Bits ? value.getUint16(1, true) : value.getUint8(1);
  }
};