"""
Logging configuration for the application.
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from app.core.config import settings

# Create logs directory if it doesn't exist
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Create formatter
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# File handler with rotation
file_handler = RotatingFileHandler(
    LOG_DIR / "app.log",
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

# Error file handler
error_handler = RotatingFileHandler(
    LOG_DIR / "error.log",
    maxBytes=10485760,  # 10MB
    backupCount=5
)
error_handler.setFormatter(formatter)
error_handler.setLevel(logging.ERROR)

# Root logger configuration
root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
root_logger.addHandler(console_handler)
root_logger.addHandler(file_handler)
root_logger.addHandler(error_handler)

# Third-party loggers
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

