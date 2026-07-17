"""HTML / text builders for admin outreach emails."""

from __future__ import annotations

import html
import re
from typing import Optional


def _escape(s: str) -> str:
    return html.escape(s or "", quote=True)


def _paragraphs_to_html(body: str) -> str:
    parts = [p.strip() for p in re.split(r"\n\s*\n", body.strip()) if p.strip()]
    if not parts:
        return ""
    blocks = []
    for p in parts:
        inner = _escape(p).replace("\n", "<br/>")
        blocks.append(
            f'<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">{inner}</p>'
        )
    return "\n".join(blocks)


def build_outreach_html(
    *,
    recipient_name: str,
    body: str,
    image_url: Optional[str],
    image_caption: Optional[str],
    cta_label: Optional[str],
    cta_url: Optional[str],
    discord_cta_label: Optional[str] = None,
    discord_cta_url: Optional[str] = None,
    github_url: str,
    pixel_url: str,
    sign_off: str,
) -> str:
    greeting = f"Hello {_escape(recipient_name)}," if recipient_name.strip() else "Hello,"
    body_html = _paragraphs_to_html(body)

    image_block = ""
    if image_url and image_url.strip():
        cap = (
            f'<p style="margin:8px 0 0;font-size:12px;line-height:1.4;color:#737373;'
            f'text-align:center;">{_escape(image_caption)}</p>'
            if image_caption and image_caption.strip()
            else ""
        )
        image_block = f"""
        <div style="margin:24px 0;padding:12px;background:#0a0a0a;border-radius:12px;">
          <img src="{_escape(image_url.strip())}" alt="ZizkaDB dashboard"
               width="560"
               style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;border:0;" />
          {cap}
        </div>
        """

    buttons = []
    if cta_label and cta_url:
        buttons.append(
            f"""<a href="{_escape(cta_url)}"
             style="display:inline-block;background:#22c55e;color:#0a0a0a;text-decoration:none;
                    font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;">
            {_escape(cta_label)}
          </a>"""
        )
    if discord_cta_label and discord_cta_url:
        buttons.append(
            f"""<a href="{_escape(discord_cta_url)}"
             style="display:inline-block;background:#5865F2;color:#ffffff;text-decoration:none;
                    font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;">
            {_escape(discord_cta_label)}
          </a>"""
        )

    cta_block = ""
    if buttons:
        spacer = '<div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>'
        cta_block = f"""
        <div style="margin:28px 0 8px;text-align:center;">
          {spacer.join(buttons)}
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;
                    border:1px solid #e4e4e7;">
        <tr>
          <td style="padding:28px 32px 12px;background:#0a0a0a;">
            <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#a3a3a3;font-weight:600;">
              ZizkaDB
            </div>
            <div style="margin-top:8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
              Know why your agent did that.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">{greeting}</p>
            {body_html}
            {image_block}
            {cta_block}
            <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#525252;">
              GitHub:
              <a href="{_escape(github_url)}" style="color:#16a34a;">{_escape(github_url)}</a>
            </p>
            <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#333333;white-space:pre-line;">
              {_escape(sign_off)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#a3a3a3;">
              Sent by ZIZKA AI S.L. · founder@zizka.ai ·
              <a href="https://db.zizka.ai" style="color:#737373;">db.zizka.ai</a>
            </p>
          </td>
        </tr>
      </table>
      <img src="{_escape(pixel_url)}" width="1" height="1" alt=""
           style="display:block;width:1px;height:1px;border:0;" />
    </td></tr>
  </table>
</body>
</html>"""


def build_outreach_text(
    *,
    recipient_name: str,
    body: str,
    image_url: Optional[str],
    cta_label: Optional[str],
    cta_url: Optional[str],
    discord_cta_label: Optional[str] = None,
    discord_cta_url: Optional[str] = None,
    github_url: str,
    sign_off: str,
) -> str:
    greeting = f"Hello {recipient_name}," if recipient_name.strip() else "Hello,"
    lines = [greeting, "", body.strip(), ""]
    if image_url:
        lines.append(f"[Screenshot: {image_url}]")
        lines.append("")
    if cta_label and cta_url:
        lines.append(f"{cta_label}: {cta_url}")
        lines.append("")
    if discord_cta_label and discord_cta_url:
        lines.append(f"{discord_cta_label}: {discord_cta_url}")
        lines.append("")
    lines.append(f"GitHub: {github_url}")
    lines.append("")
    lines.append(sign_off.strip())
    return "\n".join(lines)
