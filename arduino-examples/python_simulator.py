"""
Python Script to Simulate Sensor Data
This script generates random sensor data and sends it to the IntelliSlide dashboard
Useful for testing the dashboard without actual hardware
"""

import websocket
import json
import time
import random
from datetime import datetime

# Server settings
SERVER_URL = "ws://localhost:3000"

def generate_sensor_data():
    """Generate random sensor data"""
    return {
        "temperature": round(random.uniform(20, 30), 2),
        "humidity": round(random.uniform(40, 80), 2),
        "light": round(random.uniform(100, 900)),
        "timestamp": datetime.now().isoformat()
    }

def on_message(ws, message):
    print(f"Received: {message}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("### Connection closed ###")

def on_open(ws):
    print("### Connection established ###")
    
    def send_data():
        while True:
            try:
                data = generate_sensor_data()
                message = json.dumps(data)
                ws.send(message)
                print(f"Sent: {message}")
                time.sleep(2)  # Send data every 2 seconds
            except Exception as e:
                print(f"Error sending data: {e}")
                break
    
    # Start sending data in a separate thread
    import threading
    thread = threading.Thread(target=send_data)
    thread.daemon = True
    thread.start()

if __name__ == "__main__":
    print("Starting sensor data simulator...")
    print(f"Connecting to {SERVER_URL}")
    
    # Create WebSocket connection
    ws = websocket.WebSocketApp(
        SERVER_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    # Run forever
    ws.run_forever()
