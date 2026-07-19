import os
import logging
from supabase import create_client, Client
from app.utils.config import settings

logger = logging.getLogger(__name__)

# Initialize Supabase client lazily
supabase_client = None
try:
    is_placeholder = (
        "your-project" in settings.SUPABASE_URL or
        "your-service-role-key" in settings.SUPABASE_KEY
    )
    if not is_placeholder:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    else:
        logger.warning("Supabase URL or Key is configured with placeholder values. Using local file storage fallback.")
except Exception as e:
    logger.exception(f"Failed to instantiate Supabase Client: {e}")

def upload_file_to_supabase(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
    """
    Uploads file bytes to Supabase Storage and returns a secure pre-signed URL (valid for 24 hours).
    Falls back to storing the file on the local filesystem if the Supabase config is placeholder or unreachable.
    """
    bucket_name = settings.SUPABASE_BUCKET
    use_local_fallback = False

    if not supabase_client:
        use_local_fallback = True

    # Fallback operation
    if use_local_fallback:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        local_path = os.path.join(uploads_dir, filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        
        local_url = f"/api/v1/documents/uploads/{filename}"
        logger.info(f"Local storage fallback active. File saved at: {local_path}")
        return local_url

    try:
        # Perform upload
        # supabase storage expects path, file (bytes or file-like), and options dict
        supabase_client.storage.from_(bucket_name).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        # Generate secure pre-signed URL valid for 24 hours (86400 seconds)
        response = supabase_client.storage.from_(bucket_name).create_signed_url(
            path=filename,
            expires_in=86400
        )
        
        presigned_url = response.get("signedURL") or response.get("signedUrl")
        if not presigned_url:
            raise ValueError(f"Failed to obtain signed URL from response: {response}")
            
        logger.info(f"Uploaded to Supabase Storage. Generated pre-signed URL: {presigned_url}")
        return presigned_url
    except Exception as e:
        logger.error(f"Supabase Storage file upload failed: {e}. Falling back to disk.")
        # Final fallback to local disk
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(base_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        local_path = os.path.join(uploads_dir, filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
            
        return f"/api/v1/documents/uploads/{filename}"
