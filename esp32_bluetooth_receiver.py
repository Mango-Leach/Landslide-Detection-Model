"""
ESP32 Bluetooth Receiver - Real Sensor Data Bridge
Connects to ESP32 via Bluetooth and forwards sensor data to IntelliSlide WebSocket

Requirements:
    pip install bleak websocket-client

Usage:
    python esp32_bluetooth_receiver.py
"""

import asyncio
import json
import sys
from datetime import datetime
from bleak import BleakScanner, BleakClient
import websocket
import threading
import time

# Configuration
ESP32_DEVICE_NAME = "ESP32-LANDSLIDE-001"  # Must match Arduino code
WEBSOCKET_URL = "ws://localhost:3000"
RECONNECT_DELAY = 5  # seconds

# UUIDs for Bluetooth Serial (SPP profile)
UART_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
UART_RX_CHAR_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
UART_TX_CHAR_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

class ESP32BluetoothReceiver:
    def __init__(self):
        self.ws = None
        self.client = None
        self.device = None
        self.running = True
        self.data_buffer = ""
        
    def on_ws_open(self, ws):
        print("✅ WebSocket connected to dashboard")
        
    def on_ws_close(self, ws, close_status_code, close_msg):
        print(f"⚠️  WebSocket disconnected: {close_msg}")
        
    def on_ws_error(self, ws, error):
        print(f"❌ WebSocket error: {error}")
        
    async def find_esp32(self):
        """Scan for ESP32 Bluetooth device"""
        print(f"🔍 Scanning for {ESP32_DEVICE_NAME}...")
        
        devices = await BleakScanner.discover(timeout=10.0)
        
        for device in devices:
            if device.name and ESP32_DEVICE_NAME in device.name:
                print(f"✅ Found ESP32: {device.name} ({device.address})")
                return device
                
        print(f"❌ ESP32 not found. Make sure it's powered on and in range.")
        return None
    
    def notification_handler(self, sender, data):
        """Handle incoming Bluetooth data"""
        try:
            # Convert bytes to string
            message = data.decode('utf-8').strip()
            self.data_buffer += message
            
            # Check if we have a complete JSON object
            if '\n' in self.data_buffer:
                lines = self.data_buffer.split('\n')
                
                for line in lines[:-1]:
                    if line.strip():
                        self.process_sensor_data(line.strip())
                
                # Keep incomplete data
                self.data_buffer = lines[-1]
                
        except Exception as e:
            print(f"❌ Error processing data: {e}")
    
    def process_sensor_data(self, json_string):
        """Process and forward sensor data"""
        try:
            # Parse JSON from ESP32
            data = json.loads(json_string)
            
            # Add ISO timestamp if not using RTC timestamp
            if 'timestamp' not in data or data['timestamp'].isdigit():
                data['timestamp'] = datetime.utcnow().isoformat() + 'Z'
            
            # Print to console with soil moisture
            soil_info = f"💧Soil:{data.get('soilMoisture', 'N/A')}% " if 'soilMoisture' in data else ""
            print(f"📡 [{datetime.now().strftime('%H:%M:%S')}] "
                  f"T:{data['temperature']:.1f}°C "
                  f"H:{data['humidity']:.1f}% "
                  f"{soil_info}"
                  f"M:{data['motion']} "
                  f"[{data.get('timestamp', 'No RTC')}]")
            
            # Forward to WebSocket
            if self.ws and self.ws.connected:
                self.ws.send(json.dumps(data))
            else:
                print("⚠️  WebSocket not connected, data not sent")
                
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {json_string[:50]}... Error: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    async def connect_bluetooth(self):
        """Connect to ESP32 via Bluetooth"""
        while self.running:
            try:
                # Find device
                self.device = await self.find_esp32()
                
                if not self.device:
                    print(f"🔄 Retrying in {RECONNECT_DELAY} seconds...")
                    await asyncio.sleep(RECONNECT_DELAY)
                    continue
                
                # Connect to device
                print(f"🔌 Connecting to {self.device.name}...")
                async with BleakClient(self.device.address) as client:
                    self.client = client
                    print(f"✅ Connected to ESP32!")
                    
                    # Start receiving notifications
                    await client.start_notify(UART_TX_CHAR_UUID, self.notification_handler)
                    print("📡 Listening for sensor data...\n")
                    
                    # Keep connection alive
                    while client.is_connected and self.running:
                        await asyncio.sleep(1)
                    
                    # Stop notifications
                    await client.stop_notify(UART_TX_CHAR_UUID)
                    print("⚠️  Bluetooth disconnected")
                    
            except Exception as e:
                print(f"❌ Bluetooth error: {e}")
                print(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
                await asyncio.sleep(RECONNECT_DELAY)
    
    def connect_websocket(self):
        """Connect to WebSocket server"""
        while self.running:
            try:
                print(f"🔌 Connecting to WebSocket: {WEBSOCKET_URL}")
                self.ws = websocket.WebSocketApp(
                    WEBSOCKET_URL,
                    on_open=self.on_ws_open,
                    on_close=self.on_ws_close,
                    on_error=self.on_ws_error
                )
                self.ws.run_forever()
                
            except Exception as e:
                print(f"❌ WebSocket error: {e}")
                print(f"🔄 Reconnecting in {RECONNECT_DELAY} seconds...")
                time.sleep(RECONNECT_DELAY)
    
    async def run(self):
        """Main run loop"""
        print("╔════════════════════════════════════════╗")
        print("║  📡 ESP32 Bluetooth Receiver          ║")
        print("╚════════════════════════════════════════╝\n")
        
        # Start WebSocket in separate thread
        ws_thread = threading.Thread(target=self.connect_websocket, daemon=True)
        ws_thread.start()
        
        # Give WebSocket time to connect
        await asyncio.sleep(2)
        
        # Start Bluetooth connection
        await self.connect_bluetooth()
    
    def stop(self):
        """Stop the receiver"""
        self.running = False
        if self.ws:
            self.ws.close()

async def main():
    receiver = ESP32BluetoothReceiver()
    
    try:
        await receiver.run()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        receiver.stop()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        receiver.stop()

if __name__ == "__main__":
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ required")
        sys.exit(1)
    
    # Run
    asyncio.run(main())
