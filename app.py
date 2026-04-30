import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timezone

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__, static_folder='.', static_url_path='')
# Allow CORS for all domains so the frontend can hit it
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: Loaded GEMINI_API_KEY = {GEMINI_API_KEY[:30]}..." if GEMINI_API_KEY else "DEBUG: GEMINI_API_KEY is None")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
HISTORY_FILE = os.getenv("HISTORY_FILE", "history.json")

# History helpers for when MongoDB is unavailable

def load_local_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load local history: {e}")
    return []


def save_local_history(prompt_doc):
    try:
        history = load_local_history()
        history.insert(0, prompt_doc)
        history = history[:20]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, default=str, indent=2)
    except Exception as e:
        print(f"Warning: Could not save local history: {e}")

# Setup MongoDB
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client["art-prompts-db"]
    prompts_collection = db["prompts"]
    # Check connection
    client.server_info()
    print("Connected to MongoDB successfully.")
except Exception as e:
    print(f"Warning: Could not connect to MongoDB. Error: {e}")
    print("The app will still run but history saving might fail.")
    db = None
    prompts_collection = None

@app.route('/api/generate-prompt', methods=['POST'])
def generate_prompt():
    data = request.json
    
    if not data:
        return jsonify({"error": "No input data provided"}), 400
        
    theme = data.get("theme")
    style = data.get("style", "Any")
    
    if not theme:
        return jsonify({"error": "Theme is required"}), 400

    # System instruction to enforce creative drawing prompt generation ONLY
    system_prompt = (
        "You are an elite, highly specialized AI assistant dedicated EXCLUSIVELY to generating extraordinarily vivid, highly creative, and meticulously detailed art, illustration, and drawing prompts. "
        "Under NO circumstances should you answer general questions, write code, or engage in casual conversation. Your sole purpose is to act as a master prompt engineer for visual arts. "
        "Your task is to take a user-provided 'theme' and 'style', and transform them into a comprehensive, deeply evocative text prompt. This prompt must be optimized for use by professional artists or advanced image generation AI models to produce visually stunning masterpieces. "
        "EVEN IF the user provides only a single word or short phrase, you MUST expand it into a fully fleshed-out, ultra-realistic, and highly detailed scene. "
        "You MUST enrich the prompt by explicitly detailing the following elements: "
        "1. Subject & Scene: Intricate details of the main characters, objects, and the surrounding environment. "
        "2. Lighting & Atmosphere: Specific lighting setups (e.g., volumetric, cinematic, golden hour, neon glow) and the emotional mood or ambiance. "
        "3. Composition & Perspective: Camera angles (e.g., wide shot, macro, bird's-eye view), framing, and depth of field. "
        "4. Colors & Textures: Color palettes (e.g., monochromatic, vivid complementary, pastel) and material textures. "
        "The generated prompt MUST be long and detailed, consisting of at least 3 dense, highly descriptive lines or paragraphs. "
        "Ensure the final output is highly descriptive, beautifully written, ultra-realistic, and immediately usable. "
        "CRITICAL: Output ONLY the raw prompt text. Do NOT include any introductions, explanations, pleasantries, or conversational filler."
    )
    
    user_prompt = f"Design an immersive, ultra-realistic, and intricately detailed visual prompt based on the following parameters.\nTheme: {theme}\nStyle: {style}\nEnsure you incorporate compelling lighting, striking composition, and evocative colors. The prompt must be long, highly descriptive, and span at least 3 distinct, detailed paragraphs or long lines."
    
    try:
        # Call Google Gemini API (gemini-2.5-flash) using REST
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        # Combine system instruction with user prompt in the message
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        payload = {
            "contents": [{
                "parts": [{"text": full_prompt}]
            }],
            "generationConfig": {
                "temperature": 0.9,
                "maxOutputTokens": 1500
            }
        }
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        
        result = response.json()
        generated_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        prompt_doc = {
            "theme": theme,
            "style": style,
            "prompt": generated_text,
            "timestamp": datetime.now(timezone.utc)
        }

        if prompts_collection is not None:
            prompts_collection.insert_one(prompt_doc)
        else:
            save_local_history(prompt_doc)
            print("Info: Saved prompt locally because MongoDB is unavailable.")
            
        return jsonify({"prompt": generated_text}), 200
        
    except Exception as e:
        print(f"Error generating prompt: {e}")
        return jsonify({"error": f"Failed to generate prompt. Error: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    if prompts_collection is None:
        history = load_local_history()
        return jsonify({"history": history}), 200
        
    try:
        # Get the 20 most recent prompts
        history_cursor = prompts_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(20)
        history = list(history_cursor)
        return jsonify({"history": history}), 200
    except Exception as e:
        print(f"Error fetching history: {e}")
        return jsonify({"error": "Failed to fetch history"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
