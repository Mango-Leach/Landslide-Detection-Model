"""
ESP32 USB Serial Receiver - Alternative to Bluetooth
Connects to ESP32 via USB cable and forwards sensor data to Dashboard

Requirements:
    pip install pyserial websocket-client

Usage:
    python esp32_usb_receiver.py
"""

import serial
import serial.tools.list_ports
import json
import sys
from datetime import datetime
import websocket
import threading
import time

# Configuration
WEBSOCKET_URL = "ws://localhost:3000"
RECONNECT_DELAY = 5  # seconds
BAUD_RATE = 115200

class ESP32USBReceiver:
    def __init__(self):
        self.ws = None
        self.serial_port = None
        self.running = True
        
    def find_esp32_port(self):
        """Find ESP32 COM port automatically"""
        print("🔍 Scanning for ESP32 on USB ports...")
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            # ESP32 usually shows up as CP210x or CH340
            if any(keyword in port.description.upper() for keyword in ['CP210', 'CH340', 'UART', 'USB']):
                print(f"✅ Found potential ESP32 at: {port.device} ({port.description})")
                return port.device
        
        # If no auto-detection, show all available ports
        if ports:
            print("\n📋 Available COM ports:")
            for i, port in enumerate(ports, 1):
                print(f"  {i}. {port.device} - {port.description}")
            
            try:
                choice = int(input("\nSelect port number (or 0 to enter manually): "))
                if choice == 0:
                    return input("Enter COM port (e.g., COM3): ")
                elif 1 <= choice <= len(ports):
                    return ports[choice - 1].device
            except (ValueError, IndexError):
                pass
        
        return None
    
    def on_ws_open(self, ws):
        print("✅ WebSocket connected to dashboard")
        
    def on_ws_close(self, ws, close_status_code, close_msg):
        print(f"⚠️  WebSocket disconnected")
        
    def on_ws_error(self, ws, error):
        print(f"❌ WebSocket error: {error}")
    
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
    
    def process_serial_line(self, line):
        """Process incoming serial data"""
        try:
            # Look for JSON data (starts with '{' and ends with '}')
            if line.strip().startswith('{') and line.strip().endswith('}'):
                data = json.loads(line.strip())
                
                # Add ISO timestamp if not present
                if 'timestamp' not in data or not data['timestamp'].count('-') >= 2:
                    data['timestamp'] = datetime.utcnow().isoformat() + 'Z'
                
                # Print summary
                soil_info = f"💧Soil:{data.get('soilMoisture', 'N/A')}% " if 'soilMoisture' in data else ""
                print(f"📡 [{datetime.now().strftime('%H:%M:%S')}] "
                      f"T:{data.get('temperature', 0):.1f}°C "
                      f"H:{data.get('humidity', 0):.1f}% "
                      f"{soil_info}"
                      f"M:{data.get('motion', 'N')} "
                      f"[{data.get('timestamp', 'No RTC')[:19]}]")
                
                # Forward to WebSocket
                if self.ws and self.ws.sock and self.ws.sock.connected:
                    self.ws.send(json.dumps(data))
                else:
                    print("⚠️  WebSocket not connected, data not sent")
                    
        except json.JSONDecodeError:
            # Not JSON, probably debug output - ignore
            pass
        except Exception as e:
            print(f"❌ Error processing data: {e}")
    
    def connect_serial(self, port):
        """Connect to ESP32 via serial"""
        try:
            print(f"🔌 Connecting to {port} at {BAUD_RATE} baud...")
            self.serial_port = serial.Serial(port, BAUD_RATE, timeout=1)
            time.sleep(2)  # Wait for serial to stabilize
            print(f"✅ Connected to ESP32 on {port}")
            print("📡 Listening for sensor data...\n")
            
            # Read lines from serial
            while self.running:
                try:
                    if self.serial_port.in_waiting > 0:
                        line = self.serial_port.readline().decode('utf-8', errors='ignore')
                        self.process_serial_line(line)
                except serial.SerialException as e:
                    print(f"❌ Serial connection lost: {e}")
                    break
                except Exception as e:
                    print(f"❌ Error reading serial: {e}")
                    time.sleep(0.1)
                    
        except serial.SerialException as e:
            print(f"❌ Could not open {port}: {e}")
            print("💡 Make sure:")
            print("   - ESP32 is connected via USB")
            print("   - Arduino Serial Monitor is CLOSED")
            print("   - Correct COM port is selected")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.close()
    
    def run(self):
        """Main entry point"""
        print("\n" + "="*50)
        print("📡 ESP32 USB Serial Receiver")
        print("="*50 + "\n")
        
        # Find ESP32 port
        port = self.find_esp32_port()
        
        if not port:
            print("❌ No ESP32 found. Please connect ESP32 and try again.")
            return
        
        # Start WebSocket in background thread
        ws_thread = threading.Thread(target=self.connect_websocket, daemon=True)
        ws_thread.start()
        
        # Give WebSocket time to connect
        time.sleep(2)
        
        # Connect to serial (blocking)
        try:
            self.connect_serial(port)
        except KeyboardInterrupt:
            print("\n\n⏹️  Stopped by user")
        finally:
            self.running = False
            if self.ws:
                self.ws.close()

if __name__ == "__main__":
    receiver = ESP32USBReceiver()
    receiver.run()
