"""
Settings management endpoints.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api.deps import (
    get_db,
    get_optional_active_user,
    require_permission,
    user_has_permission,
)
from app.models.common import Setting
from app.models.auth import User
from app.schemas.setting import (
    SettingRead, SettingCreate, SettingUpdate, SettingMultipleUpdate
)
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException
from app.core.redis_client import get_cached_json, set_cached_json, delete_cache_by_prefix

router = APIRouter()
SETTINGS_CACHE_PREFIX = "cache:settings:"

# Branding on login page (site name, logos) — readable without login
PUBLIC_SETTING_GROUPS = frozenset({"general", "appearance"})


def _ensure_setting_group_readable(
    group_name: str,
    current_user: Optional[User],
    db: Session,
) -> None:
    if group_name in PUBLIC_SETTING_GROUPS:
        return
    if current_user is None:
        raise UnauthorizedException("Authentication required")
    if not user_has_permission(db, current_user, "view_setting"):
        raise ForbiddenException("Insufficient permissions")


@router.get("/", response_model=WebResponse[list[SettingRead]])
def get_all_settings(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_setting")),
):
    """Get all settings (authenticated, view_setting)."""
    cache_key = f"{SETTINGS_CACHE_PREFIX}all"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return WebResponse(status="success", data=cached)

    settings = db.query(Setting).order_by(Setting.group, Setting.name).all()
    payload = [SettingRead.model_validate(s).model_dump(mode="json") for s in settings]
    set_cached_json(cache_key, payload)

    return WebResponse(
        status="success",
        data=payload
    )


@router.get("/group/{group_name}", response_model=WebResponse[Dict[str, Any]])
def get_settings_by_group(
    group_name: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_active_user),
):
    """
    Get all settings in a group as a dictionary.
    Groups ``general`` and ``appearance`` are public (login branding).
    """
    _ensure_setting_group_readable(group_name, current_user, db)

    cache_key = f"{SETTINGS_CACHE_PREFIX}group:{group_name}"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return WebResponse(status="success", data=cached)

    settings = db.query(Setting).filter(Setting.group == group_name).all()

    result = {}
    for setting in settings:
        result[setting.name] = setting.payload
    set_cached_json(cache_key, result)

    return WebResponse(
        status="success",
        data=result
    )


@router.get("/{group_name}/{setting_name}", response_model=WebResponse[Dict[str, Any]])
def get_setting(
    group_name: str,
    setting_name: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_active_user),
):
    """Get a single setting; non-public groups require view_setting."""
    _ensure_setting_group_readable(group_name, current_user, db)

    cache_key = f"{SETTINGS_CACHE_PREFIX}item:{group_name}:{setting_name}"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return WebResponse(status="success", data=cached)

    setting = db.query(Setting).filter(
        and_(
            Setting.group == group_name,
            Setting.name == setting_name
        )
    ).first()

    if not setting:
        raise NotFoundException(
            f"Setting '{setting_name}' in group '{group_name}' not found"
        )

    data = {"value": setting.payload}
    set_cached_json(cache_key, data)

    return WebResponse(
        status="success",
        data=data
    )


@router.post("/", response_model=WebResponse[SettingRead], status_code=status.HTTP_201_CREATED)
def create_setting(
    setting_data: SettingCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("create_setting")),
):
    """Create a new setting (or update if exists - upsert behavior)."""
    existing = db.query(Setting).filter(
        and_(
            Setting.group == setting_data.group,
            Setting.name == setting_data.name
        )
    ).first()

    if existing:
        if existing.locked == 1:
            raise ForbiddenException("Setting is locked and cannot be modified")

        existing.payload = setting_data.payload
        if setting_data.locked is not None:
            existing.locked = 1 if setting_data.locked else 0

        db.commit()
        db.refresh(existing)
        delete_cache_by_prefix(SETTINGS_CACHE_PREFIX)

        return WebResponse(
            status="success",
            message="Setting updated successfully",
            data=SettingRead.model_validate(existing)
        )

    setting = Setting(
        group=setting_data.group,
        name=setting_data.name,
        payload=setting_data.payload,
        locked=1 if setting_data.locked else 0
    )

    db.add(setting)
    db.commit()
    db.refresh(setting)
    delete_cache_by_prefix(SETTINGS_CACHE_PREFIX)

    return WebResponse(
        status="success",
        message="Setting created successfully",
        data=SettingRead.model_validate(setting)
    )


@router.put("/{group_name}/{setting_name}", response_model=WebResponse[SettingRead])
def update_setting(
    group_name: str,
    setting_name: str,
    setting_update: SettingUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_setting")),
):
    """Update a setting by group and name."""
    setting = db.query(Setting).filter(
        and_(
            Setting.group == group_name,
            Setting.name == setting_name
        )
    ).first()

    if not setting:
        raise NotFoundException(
            f"Setting '{setting_name}' in group '{group_name}' not found"
        )

    if setting.locked == 1:
        raise ForbiddenException("Setting is locked and cannot be modified")

    update_data = setting_update.model_dump(exclude_unset=True)

    if "payload" in update_data:
        setting.payload = update_data["payload"]

    if "locked" in update_data:
        setting.locked = 1 if update_data["locked"] else 0

    db.commit()
    db.refresh(setting)
    delete_cache_by_prefix(SETTINGS_CACHE_PREFIX)

    return WebResponse(
        status="success",
        message="Setting updated successfully",
        data=SettingRead.model_validate(setting)
    )


@router.put("/multiple", response_model=WebResponse[list[SettingRead]])
def update_multiple_settings(
    settings_data: SettingMultipleUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_setting")),
):
    """Update multiple settings at once."""
    updated_settings = []

    for setting_data in settings_data.settings:
        existing = db.query(Setting).filter(
            and_(
                Setting.group == setting_data.group,
                Setting.name == setting_data.name
            )
        ).first()

        if existing:
            if existing.locked == 1:
                continue

            existing.payload = setting_data.payload
            if setting_data.locked is not None:
                existing.locked = 1 if setting_data.locked else 0

            db.flush()
            updated_settings.append(existing)
        else:
            new_setting = Setting(
                group=setting_data.group,
                name=setting_data.name,
                payload=setting_data.payload,
                locked=1 if setting_data.locked else 0
            )
            db.add(new_setting)
            db.flush()
            updated_settings.append(new_setting)

    db.commit()
    delete_cache_by_prefix(SETTINGS_CACHE_PREFIX)

    for setting in updated_settings:
        db.refresh(setting)

    return WebResponse(
        status="success",
        message="Settings updated successfully",
        data=[SettingRead.model_validate(s) for s in updated_settings]
    )


@router.delete("/{group_name}/{setting_name}", response_model=WebResponse[None])
def delete_setting(
    group_name: str,
    setting_name: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("delete_setting")),
):
    """Delete a setting by group and name."""
    setting = db.query(Setting).filter(
        and_(
            Setting.group == group_name,
            Setting.name == setting_name
        )
    ).first()

    if not setting:
        raise NotFoundException(
            f"Setting '{setting_name}' in group '{group_name}' not found"
        )

    if setting.locked == 1:
        raise ForbiddenException("Setting is locked and cannot be deleted")

    db.delete(setting)
    db.commit()
    delete_cache_by_prefix(SETTINGS_CACHE_PREFIX)

    return WebResponse(
        status="success",
        message="Setting deleted successfully"
    )
