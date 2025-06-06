import os
from email.message import EmailMessage
from aiosmtplib import send
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")

async def send_email(to: str, subject: str, content: str):
    # Check if email configuration is available
    if not EMAIL_USER or not EMAIL_PASS:
        print("⚠️ Email service not configured. Skipping email send.")
        return False
    
    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(content, subtype="html")

    try:
        await send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=EMAIL_USER,
            password=EMAIL_PASS
        )
        print(f"✅ Email sent to {to}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to}: {e}")
        return False

