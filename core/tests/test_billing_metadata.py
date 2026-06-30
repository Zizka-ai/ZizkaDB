"""Stripe metadata normalization — StripeObject has no .get()."""

from services.billing import stripe_metadata


class _FakeStripeMetadata:
    def __getitem__(self, key):
        if key == "user_id":
            return "00000000-0000-0000-0000-000000000099"
        if key == "plan":
            return "pro"
        raise KeyError(key)


def test_stripe_metadata_from_subscript_object():
    meta = stripe_metadata(_FakeStripeMetadata())
    assert meta["user_id"] == "00000000-0000-0000-0000-000000000099"
    assert meta["plan"] == "pro"


def test_stripe_metadata_from_plain_dict():
    meta = stripe_metadata({"user_id": "abc", "plan": "team"})
    assert meta == {"user_id": "abc", "plan": "team"}
