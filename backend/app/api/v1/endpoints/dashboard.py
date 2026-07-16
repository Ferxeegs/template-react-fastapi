"""
Dashboard statistics and summary endpoints.
Data is filtered by the current user's role scope (unit access).
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.auth import Role, User
from app.models.unit import Unit
from app.schemas.common import WebResponse
from app.services import scope_service as scope_svc

router = APIRouter()


@router.get("/summary", response_model=WebResponse[Dict[str, Any]])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generic admin summary: users, roles, and units in scope."""
    if scope_svc.is_superadmin(db, current_user):
        users_count = db.query(User).filter(User.deleted_at.is_(None)).count()
        roles_count = db.query(Role).count()
    else:
        users_count = 0
        roles_count = 0

    units_q = scope_svc.apply_unit_scope_filter(db.query(Unit), Unit.id, db, current_user)
    units_count = units_q.count()

    return WebResponse(
        status="success",
        data={
            "counts": {
                "users": users_count,
                "roles": roles_count,
                "units": units_count,
            },
        },
    )
