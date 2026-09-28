# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Google Workspace mailbox for info@yallabusiness.ai.

Workspace often hides App Passwords. Send through smtp-relay.gmail.com
and authorize this server's public IP in Google Admin instead.
"""

from __future__ import annotations

import smtplib

import frappe

INFO_EMAIL = "info@yallabusiness.ai"
ACCOUNT_NAME = "Yalla Business"
SMTP_RELAY = "smtp-relay.gmail.com"
SMTP_HELO = "yallabusiness.ai"
SERVER_PUBLIC_IP = "161.35.5.73"


def apply_workspace_relay(doc):
	"""Never use smtp.gmail.com + password — App Passwords are blocked."""
	doc.service = ""
	doc.auth_method = "Basic"
	doc.enable_outgoing = 1
	doc.default_outgoing = 1
	doc.smtp_server = SMTP_RELAY
	doc.smtp_port = 587
	doc.use_tls = 1
	doc.use_ssl_for_outgoing = 0
	doc.no_smtp_authentication = 1
	doc.awaiting_password = 0
	doc.password = None
	doc.login_id_is_different = 0
	doc.login_id = None
	doc.always_use_account_email_id_as_sender = 1
	doc.always_use_account_name_as_sender_name = 1
	doc.enable_incoming = 0
	doc.use_imap = 0


def force_workspace_relay(doc, method=None):
	if (doc.email_id or "").strip().lower() != INFO_EMAIL:
		return
	apply_workspace_relay(doc)


def patch_smtp_helo():
	if getattr(smtplib.SMTP, "_yalla_helo", None) == SMTP_HELO:
		return
	orig = smtplib.SMTP.__init__

	def wrapped(self, host="", port=0, local_hostname=None, *args, **kwargs):
		if not local_hostname:
			local_hostname = SMTP_HELO
		return orig(self, host, port, local_hostname, *args, **kwargs)

	smtplib.SMTP.__init__ = wrapped
	smtplib.SMTP._yalla_helo = SMTP_HELO


def ensure_info_email_account():
	if not frappe.db.exists("DocType", "Email Account"):
		return None

	patch_smtp_helo()

	existing = frappe.db.get_value("Email Account", {"email_id": INFO_EMAIL}, "name")
	if existing:
		doc = frappe.get_doc("Email Account", existing)
	else:
		doc = frappe.new_doc("Email Account")
		doc.email_account_name = ACCOUNT_NAME
		doc.email_id = INFO_EMAIL

	apply_workspace_relay(doc)

	doc.flags.ignore_permissions = True
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return doc.name


def notify_new_inquiry(doc):
	patch_smtp_helo()
	if not frappe.db.exists("Email Account", {"email_id": INFO_EMAIL, "enable_outgoing": 1}):
		return
	if frappe.db.get_value("Email Account", {"email_id": INFO_EMAIL}, "awaiting_password"):
		return

	subject = f"طلب جديد — {doc.full_name}"
	lines = [
		f"الاسم: {doc.full_name or ''}",
		f"الشركة: {doc.company or ''}",
		f"البريد: {doc.email or ''}",
		f"الجوال: {doc.phone or ''}",
		f"الخدمة: {doc.service_interest or ''}",
		f"الخطة: {doc.plan_interest or ''}",
		f"المدة: {doc.plan_term or ''}",
		f"اللغة: {doc.preferred_language or ''}",
		f"المصدر: {doc.source_page or ''}",
		f"الحملة: {doc.utm_source or ''} / {doc.utm_medium or ''} / {doc.utm_campaign or ''}",
		f"الدولة: {doc.country or ''}",
		"",
		doc.message or "",
	]
	try:
		frappe.sendmail(
			recipients=[INFO_EMAIL],
			subject=subject,
			message="<br>".join(frappe.utils.escape_html(line) for line in lines),
			now=False,
			delayed=True,
			reference_doctype=doc.doctype,
			reference_name=doc.name,
			retry=3,
		)
	except Exception:
		frappe.log_error(title="Yalla Inquiry email failed")
