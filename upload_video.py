import os
import requests
import base64
import sys
import json

# Configuration
FILE_PATH = "/Users/bozoegg/Desktop/DreamBeesv11/Minecraft_Lush_Caves_H264.mp4"
ACCOUNT_ID = "33f8b2564698c222880cbad3e42decad"
AUTH_TOKEN = "3PBi_PyyEzrECdmXtUgXxv1sO8pkIUPHWov97ZkO"
CHUNK_SIZE = 50 * 1024 * 1024  # 50MB per chunk
STATE_FILE = ".upload_state.json"

def save_state(location):
    with open(STATE_FILE, "w") as f:
        json.dump({"location": location}, f)

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f).get("location")
    return None

def get_server_offset(location):
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Tus-Resumable": "1.0.0"
    }
    response = requests.head(location, headers=headers)
    if response.status_code == 200:
        return int(response.headers.get("Upload-Offset", 0))
    return None

def upload():
    if not os.path.exists(FILE_PATH):
        print(f"Error: File {FILE_PATH} does not exist.")
        return

    file_size = os.path.getsize(FILE_PATH)
    file_name = os.path.basename(FILE_PATH)
    
    location = load_state()
    offset = 0

    if location:
        print(f"Found existing upload state. Checking progress on server...")
        offset = get_server_offset(location)
        if offset is not None:
            print(f"Resuming upload from offset {offset} ({offset/file_size*100:.2f}%)")
        else:
            print("Existing location expired or invalid. Starting new upload.")
            location = None
            offset = 0

    if not location:
        # Metadata must be base64 encoded for TUS
        encoded_name = base64.b64encode(file_name.encode()).decode()
        metadata = f"name {encoded_name}"
        print(f"Initializing new upload for {file_name} ({file_size / (1024**3):.2f} GB)...")

        headers = {
            "Authorization": f"Bearer {AUTH_TOKEN}",
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(file_size),
            "Upload-Metadata": metadata
        }
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/stream"
        response = requests.post(url, headers=headers)
        
        if response.status_code != 201:
            print(f"Failed to initialize upload: {response.status_code}")
            print(response.text)
            return

        location = response.headers.get("Location")
        if not location:
            print("Error: No Location header in response.")
            return

        save_state(location)
        print(f"Upload initialized. Location: {location}")

    # Upload chunks
    with open(FILE_PATH, "rb") as f:
        while offset < file_size:
            f.seek(offset)
            chunk_data = f.read(CHUNK_SIZE)
            actual_chunk_size = len(chunk_data)
            
            patch_headers = {
                "Authorization": f"Bearer {AUTH_TOKEN}",
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": str(offset),
                "Content-Type": "application/offset+octet-stream"
            }
            
            print(f"Uploading chunk: offset {offset} to {offset + actual_chunk_size} ({offset/file_size*100:.2f}%)...", end="\r")
            
            try:
                patch_response = requests.patch(location, headers=patch_headers, data=chunk_data, timeout=60)
                if patch_response.status_code != 204:
                    print(f"\nFailed to upload chunk at offset {offset}: {patch_response.status_code}")
                    print(patch_response.text)
                    return
                
                offset = int(patch_response.headers.get("Upload-Offset", offset + actual_chunk_size))
            except requests.exceptions.RequestException as e:
                print(f"\nNetwork error at offset {offset}: {e}. Retrying in 5 seconds...")
                import time
                time.sleep(5)
                # Re-verify offset from server in case of partial success
                server_offset = get_server_offset(location)
                if server_offset is not None:
                    offset = server_offset

    print(f"\nUpload complete! Progress: 100.00%")
    print(f"Final response headers: {patch_response.headers}")
    print(f"Stream-Media-ID: {patch_response.headers.get('Stream-Media-ID')}")
    
    # Cleanup state file on success
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)

if __name__ == "__main__":
    upload()
