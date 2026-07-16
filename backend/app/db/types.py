"""SQLAlchemy column types."""
from datetime import datetime, timezone

from sqlalchemy.types import DateTime, TypeDecorator


class UTCDateTime(TypeDecorator):
    """
    MySQL returns naive DATETIME values; application stores UTC wall clock.
    Attach UTC on read so API serializers emit timezone-aware ISO strings.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
