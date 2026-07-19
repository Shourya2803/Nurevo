import logging
import os
from datetime import datetime
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.utils.config import settings

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, html_content: str) -> None:
    """
    Asynchronously sends an HTML email.
    If in local development and using placeholder values, it prints a preview to logs.
    """
    logger.info(f"Preparing to send email to {to_email} with subject: {subject}")
    
    # Fallback to local logs if in local development with default settings
    if settings.ENVIRONMENT == "development" and (settings.SMTP_HOST == "smtp.mailtrap.io" or not settings.SMTP_USER or settings.SMTP_USER == "test_smtp_user"):
        logger.info("======== DEV EMAIL PREVIEW ========")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info("====================================")
        
        # Save HTML preview to a local file for convenient debugging / link clicking
        try:
            os.makedirs("dev_emails", exist_ok=True)
            filename = f"dev_emails/{to_email}_{int(datetime.utcnow().timestamp())}.html"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(f"<!--\nTo: {to_email}\nSubject: {subject}\n-->\n{html_content}")
            logger.info(f"Email preview saved to local file: {filename}")
        except Exception as file_err:
            logger.error(f"Failed to save local dev email preview: {file_err}")
        return

    message = MIMEMultipart("alternative")
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = subject

    part = MIMEText(html_content, "html")
    message.attach(part)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=(settings.SMTP_PORT == 465),
            start_tls=(settings.SMTP_PORT in [587, 2525])
        )
        logger.info(f"Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        # Log to warning as fallback
        logger.warning(f"Email sending failed. Fallback payload:\n{html_content}")
