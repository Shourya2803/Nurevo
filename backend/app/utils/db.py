import logging
import pymongo
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db = None

    def connect_to_database(self):
        logger.info("Connecting to MongoDB...")
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        self.db = self.client[settings.MONGO_DB_NAME]
        logger.info(f"Connected to database: {settings.MONGO_DB_NAME}")

    def close_database_connection(self):
        if self.client:
            logger.info("Closing MongoDB connection...")
            self.client.close()
            logger.info("MongoDB connection closed.")

db_manager = DatabaseManager()

def get_database():
    if db_manager.db is None:
        raise RuntimeError("Database connection not initialized. Call connect_to_database first.")
    return db_manager.db

async def init_db_indexes():
    db = get_database()
    logger.info("Initializing database indexes...")
    try:
        # User indexes
        await db["users"].create_index([("email", pymongo.ASCENDING)], unique=True)
        await db["users"].create_index([("workspace_id", pymongo.ASCENDING), ("role", pymongo.ASCENDING)])

        # Workspace indexes
        await db["workspaces"].create_index([("slug", pymongo.ASCENDING)], unique=True)

        # Invitation indexes
        await db["invitations"].create_index([("token", pymongo.ASCENDING)], unique=True)
        await db["invitations"].create_index([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0)

        # MagicLink indexes
        await db["magic_links"].create_index([("token", pymongo.ASCENDING)], unique=True)
        await db["magic_links"].create_index([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0)

        # Document indexes
        await db["documents"].create_index([("workspace_id", pymongo.ASCENDING), ("team_id", pymongo.ASCENDING)])
        await db["documents"].create_index([
            ("title", pymongo.TEXT),
            ("description", pymongo.TEXT),
            ("content", pymongo.TEXT)
        ], weights={
            "title": 10,
            "description": 5,
            "content": 1
        }, name="document_text_search_index")

        # Notification indexes
        await db["notifications"].create_index([("user_id", pymongo.ASCENDING), ("is_read", pymongo.ASCENDING)])

        # Chat message indexes
        await db["messages"].create_index([("conversation_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)])
        
        logger.info("Database indexes initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database indexes: {e}")

