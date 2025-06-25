import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 【修改】從直接引用 db 物件，而不是不存在的函式
from backend.MD_firebase_config import db

def populate_data(collection_name, data):
    """Populates a Firestore collection with data from a dictionary."""
    for doc_id, doc_data in data.items():
        doc_ref = db.collection(collection_name).document(doc_id)
        doc_ref.set(doc_data)
        print(f'Successfully populated {doc_id} in {collection_name}')

def load_and_populate(file_path, collection_name):
    """Loads data from a JSON file and populates a Firestore collection."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        populate_data(collection_name, data)
    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
    except json.JSONDecodeError:
        print(f"Error: The file {file_path} is not a valid JSON file.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    # 檢查 db 是否成功初始化
    if not db:
        print("CRITICAL: Firestore database client is not initialized. Cannot populate data.")
        sys.exit(1)
        
    print("Database client found. Starting data population...")

    # Define paths to your JSON files
    # The script is expected to be run from the root of the repository.
    skill_files = {
        'dark': 'backend/monster/skills/dark.json',
        'earth': 'backend/monster/skills/earth.json',
        'fire': 'backend/monster/skills/fire.json',
        'gold': 'backend/monster/skills/gold.json',
        'light': 'backend/monster/skills/light.json',
        'mix': 'backend/monster/skills/mix.json',
        'none': 'backend/monster/skills/none.json',
        'poison': 'backend/monster/skills/poison.json',
        'water': 'backend/monster/skills/water.json',
        'wind': 'backend/monster/skills/wind.json',
        'wood': 'backend/monster/skills/wood.json'
    }

    dna_files = {
        'dark': 'backend/monster/DNA/DNA_dark.json',
        'earth': 'backend/monster/DNA/DNA_earth.json',
        'fire': 'backend/monster/DNA/DNA_fire.json',
        'gold': 'backend/monster/DNA/DNA_gold.json',
        'light': 'backend/monster/DNA/DNA_light.json',
        'mix': 'backend/monster/DNA/DNA_mix.json',
        'none': 'backend/monster/DNA/DNA_none.json',
        'poison': 'backend/monster/DNA/DNA_poison.json',
        'water': 'backend/monster/DNA/DNA_water.json',
        'wind': 'backend/monster/DNA/DNA_wind.json',
        'wood': 'backend/monster/DNA/DNA_wood.json'
    }
    
    # Populate skills
    for element, file_path in skill_files.items():
        collection_name = f'skills_{element}'
        # This function seems designed for a different format, we will skip it for now
        # load_and_populate(file_path, collection_name)

    # Populate DNA
    for element, file_path in dna_files.items():
        collection_name = f'DNA_{element}'
        # This function seems designed for a different format, we will skip it for now
        # load_and_populate(file_path, collection_name)
        
    print("All data population tasks are complete.")
