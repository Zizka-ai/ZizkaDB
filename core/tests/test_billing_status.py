"""Unit tests for plan/trial billing status (no payment provider)."""

from services.billing import billing_status_payload


class TestBillingStatusPayload:
    def test_empty_row_always_has_access(self):
        payload = billing_status_payload(None)
        assert payload["enforced"] is False
        assert payload["has_access"] is True
        assert payload["requires_checkout"] is False
        assert payload["requires_plan_selection"] is False

    def test_user_row_always_has_access(self):
        payload = billing_status_payload({
            "plan": "pro",
            "subscription_status": "pending_checkout",
            "trial_ends_at": None,
        })
        assert payload["has_access"] is True
        assert payload["requires_checkout"] is False
        assert payload["plan"] == "pro"
        assert payload["subscription_status"] == "pending_checkout"

    def test_includes_trial_days(self):
        payload = billing_status_payload(None)
        assert payload["trial_days"] == 30
