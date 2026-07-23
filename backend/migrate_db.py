import os
import pymongo
from dotenv import load_dotenv

def migrate():
    # Load .env manually to ensure we get the local config
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    src_db_name = "nurevo_db"
    dest_db_name = "nuvero_db"
    
    print(f"Connecting to MongoDB at URI: {mongo_uri}")
    client = pymongo.MongoClient(mongo_uri)
    
    db_list = client.list_database_names()
    print(f"Available databases: {db_list}")
    
    if src_db_name not in db_list:
        print(f"Error: Source database '{src_db_name}' not found on this MongoDB cluster.")
        return
        
    src_db = client[src_db_name]
    dest_db = client[dest_db_name]
    
    collections = src_db.list_collection_names()
    print(f"Found {len(collections)} collections in source database: {collections}")
    
    for col_name in collections:
        if col_name.startswith("system."):
            continue
        print(f"Migrating collection '{col_name}'...")
        docs = list(src_db[col_name].find())
        if docs:
            # Delete existing in destination to prevent duplicates
            dest_db[col_name].delete_many({})
            dest_db[col_name].insert_many(docs)
            print(f"  Successfully copied {len(docs)} documents.")
        else:
            print("  Collection is empty, skipping.")
            
    print("\nMigration to 'nuvero_db' finished successfully!")

if __name__ == "__main__":
    migrate()
