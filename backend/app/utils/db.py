import logging
import pymongo
from contextlib import asynccontextmanager
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

@asynccontextmanager
async def transaction_session():
    """
    Context manager for executing operations within a MongoDB transaction.
    Falls back gracefully to non-transactional execution if running on a standalone MongoDB instance or mock runner.
    """
    if db_manager.client is None:
        yield None
        return

    try:
        async with await db_manager.client.start_session() as session:
            async with session.start_transaction():
                yield session
    except (NotImplementedError, AttributeError, Exception) as e:
        err_str = str(e)
        if isinstance(e, NotImplementedError) or "Transaction numbers are only allowed" in err_str or "replica set" in err_str.lower() or "standalone" in err_str.lower() or "mongomock" in err_str.lower():
            logger.warning("MongoDB Replica Set / Session transactions not supported in current env. Executing without transaction wrapper.")
            yield None
        else:
            logger.error(f"MongoDB transaction error: {e}")
            raise

async def init_db_indexes():
    db = get_database()
    logger.info("Initializing database indexes...")
    try:
        # User indexes
        await db["users"].create_index([("email", pymongo.ASCENDING)], unique=True)
        await db["users"].create_index([("workspace_id", pymongo.ASCENDING), ("role", pymongo.ASCENDING)])

        # Workspace indexes
        await db["workspaces"].create_index([("slug", pymongo.ASCENDING)], unique=True)

        # Team indexes
        await db["teams"].create_index([("workspace_id", pymongo.ASCENDING), ("member_ids", pymongo.ASCENDING)])
        await db["teams"].create_index([("workspace_id", pymongo.ASCENDING), ("team_lead_id", pymongo.ASCENDING)])

        # Invitation indexes
        await db["invitations"].create_index([("token", pymongo.ASCENDING)], unique=True)
        await db["invitations"].create_index([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0)

        # MagicLink indexes
        await db["magic_links"].create_index([("token", pymongo.ASCENDING)], unique=True)
        await db["magic_links"].create_index([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0)

        # Document indexes
        await db["documents"].create_index([("workspace_id", pymongo.ASCENDING), ("team_id", pymongo.ASCENDING)])
        await db["documents"].create_index([
            ("workspace_id", pymongo.ASCENDING),
            ("status", pymongo.ASCENDING),
            ("is_deleted", pymongo.ASCENDING),
            ("created_at", pymongo.DESCENDING)
        ])
        await db["documents"].create_index([
            ("workspace_id", pymongo.ASCENDING),
            ("team_id", pymongo.ASCENDING),
            ("status", pymongo.ASCENDING),
            ("is_deleted", pymongo.ASCENDING)
        ])
        await db["documents"].create_index([
            ("title", pymongo.TEXT),
            ("description", pymongo.TEXT),
            ("content", pymongo.TEXT)
        ], weights={
            "title": 10,
            "description": 5,
            "content": 1
        }, name="document_text_search_index")

        # Announcement indexes
        await db["announcements"].create_index([("workspace_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])

        # Notification indexes
        await db["notifications"].create_index([("user_id", pymongo.ASCENDING), ("is_read", pymongo.ASCENDING)])

        logger.info("Database indexes initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database indexes: {e}")


