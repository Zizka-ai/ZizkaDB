"""Unit tests for outreach HTML template builder (no DB / SMTP)."""

from services.outreach_template import build_outreach_html, build_outreach_text


def test_build_outreach_html_includes_pixel_and_image():
    html = build_outreach_html(
        recipient_name="Federico",
        body="Hello world.\n\nSecond paragraph.",
        image_url="https://db.zizka.ai/outreach/dashboard-preview.png",
        image_caption="Dashboard preview",
        cta_label="Star on GitHub",
        cta_url="https://github.com/Zizka-ai/ZizkaDB",
        discord_cta_label="Join our Discord community",
        discord_cta_url="https://discord.gg/EBjAABKkh",
        github_url="https://github.com/Zizka-ai/ZizkaDB",
        pixel_url="https://api.example/v1/outreach/o/abc.gif",
        sign_off="Best,\nMir",
    )
    assert "Hello Federico," in html
    assert "Second paragraph." in html
    assert "dashboard-preview.png" in html
    assert "Dashboard preview" in html
    assert "Star on GitHub" in html
    assert "Join our Discord community" in html
    assert "https://discord.gg/EBjAABKkh" in html
    assert "api.example/v1/outreach/o/abc.gif" in html


def test_build_outreach_escapes_html():
    html = build_outreach_html(
        recipient_name="<script>alert(1)</script>",
        body="Click <b>here</b>",
        image_url=None,
        image_caption=None,
        cta_label=None,
        cta_url=None,
        discord_cta_label=None,
        discord_cta_url=None,
        github_url="https://github.com/Zizka-ai/ZizkaDB",
        pixel_url="https://x/p.gif",
        sign_off="Mir",
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&lt;b&gt;here&lt;/b&gt;" in html
    assert "Join our Discord" not in html


def test_build_outreach_text():
    text = build_outreach_text(
        recipient_name="Federico",
        body="Line one",
        image_url="https://img.example/a.png",
        cta_label="Star",
        cta_url="https://github.com/Zizka-ai/ZizkaDB",
        discord_cta_label="Join our Discord community",
        discord_cta_url="https://discord.gg/EBjAABKkh",
        github_url="https://github.com/Zizka-ai/ZizkaDB",
        sign_off="Mir",
    )
    assert text.startswith("Hello Federico,")
    assert "Line one" in text
    assert "[Screenshot:" in text
    assert "Star: https://github.com" in text
    assert "Join our Discord community: https://discord.gg/EBjAABKkh" in text
