#!/usr/bin/env python3
"""
Simple script to run the FastAPI server locally for testing.
Usage: python run_local.py
"""

import subprocess
import sys
import os

def main():
    # Change to the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Check if .env file exists
    env_file = os.path.join(script_dir, '.env')
    if not os.path.exists(env_file):
        print("⚠️  Warning: .env file not found!")
        print("   Create a .env file with:")
        print("   - PINECONE_API_KEY")
        print("   - PINECONE_INDEX_NAME")
        print("   - OPENAI_API_KEY")
        print("   - FIREBASE_SERVICE_ACCOUNT_JSON (for /api/ingestion/* routes)")
        print("   - GCP_PROJECT_ID (optional)")
        print()
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    print("🚀 Starting FastAPI server on http://localhost:8000")
    print("📚 API docs available at http://localhost:8000/docs")
    print("🛑 Press Ctrl+C to stop the server")
    print()
    
    try:
        # Run uvicorn with reload for development
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    main()

