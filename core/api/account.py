"""Managed-cloud account settings — delete account or retention trial."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from api.deps import dashboard_session_dependency
from services.account import account_options, delete_managed_account, grant_retention_trial

router = APIRouter()
log = logging.getLogger(__name__)

require_dashboard_session = dashboard_session_dependency(
    "Sign in to the dashboard to manage your account"
)


@router.get("/options")
async def get_account_options(session: dict = Depends(require_dashboard_session)):
    return await account_options(user_id=session["user_id"])


@router.post("/retention-trial")
async def retention_trial(session: dict = Depends(require_dashboard_session)):
    try:
        return await grant_retention_trial(user_id=session["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("retention trial failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not extend trial")


@router.delete("")
async def delete_account(session: dict = Depends(require_dashboard_session)):
    try:
        await delete_managed_account(
            user_id=session["user_id"],
            tenant_id=session["tenant_id"],
        )
        return {"message": "Account deleted"}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Invalid session")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("account delete failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not delete account")
