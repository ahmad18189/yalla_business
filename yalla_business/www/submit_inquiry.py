# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import hashlib
import re

import frappe
from frappe.utils import cint, now, strip_html

no_cache = 1

SERVICE_ALLOWLIST = {"erp", "sign", "both"}
PLAN_ALLOWLIST = {"", "lite", "standard", "professional"}
TERM_ALLOWLIST = {"", "3", "6", "12"}
LANG_ALLOWLIST = {"", "ar", "en"}

MAX_NAME = 120
MAX_COMPANY = 160
MAX_EMAIL = 140
MAX_PHONE = 40
MAX_MESSAGE = 2000
MAX_SOURCE = 200
RATE_LIMIT = 5
RATE_WINDOW = 3600


def get_context(context):
	frappe.local.flags.redirect_location = "/"
	raise frappe.Redirect


@frappe.whitelist(allow_guest=True, methods=["POST"])
def submit_inquiry(
	full_name=None,
	company=None,
	email=None,
	phone=None,
	service_interest=None,
	plan_interest=None,
	plan_term=None,
	message=None,
	preferred_language=None,
	source_page=None,
	privacy=None,
	honeypot=None,
):
	_reject_bad_request()

	if honeypot:
		frappe.local.response["http_status_code"] = 400
		return {"ok": 0, "code": "rejected"}

	full_name = _clean_text(full_name, MAX_NAME)
	company = _clean_text(company, MAX_COMPANY)
	email = _clean_email(email)
	phone = _clean_phone(phone)
	service_interest = (service_interest or "").strip().lower()
	plan_interest = (plan_interest or "").strip().lower()
	plan_term = str(plan_term or "").strip()
	preferred_language = (preferred_language or "").strip().lower()
	message = _clean_text(message, MAX_MESSAGE)
	source_page = _clean_text(source_page, MAX_SOURCE)
	privacy_ok = str(privacy or "").strip().lower() in {"1", "true", "on", "yes"}

	errors = []
	if not full_name:
		errors.append("full_name")
	if not phone:
		errors.append("phone")
	if not email:
		errors.append("email")
	if service_interest not in SERVICE_ALLOWLIST:
		errors.append("service_interest")
	if plan_interest not in PLAN_ALLOWLIST:
		errors.append("plan_interest")
	if plan_term not in TERM_ALLOWLIST:
		errors.append("plan_term")
	if preferred_language not in LANG_ALLOWLIST:
		errors.append("preferred_language")
	if not privacy_ok:
		errors.append("privacy")

	if errors:
		frappe.local.response["http_status_code"] = 400
		return {"ok": 0, "code": "invalid", "fields": errors}

	ip_hash = _ip_hash()
	if not _allow_rate(ip_hash):
		frappe.local.response["http_status_code"] = 429
		return {"ok": 0, "code": "rate_limited"}

	user_agent = (frappe.request.headers.get("User-Agent") or "")[:400]

	try:
		doc = frappe.new_doc("Yalla Inquiry")
		doc.full_name = full_name
		doc.company = company
		doc.email = email
		doc.phone = phone
		doc.service_interest = service_interest
		doc.plan_interest = plan_interest or None
		doc.plan_term = plan_term or None
		doc.message = message
		doc.preferred_language = preferred_language or None
		doc.source_page = source_page or "/"
		doc.status = "New"
		doc.submitted_at = now()
		doc.ip_hash = ip_hash
		doc.user_agent = user_agent
		doc.flags.ignore_permissions = True
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
	except Exception:
		frappe.log_error(title="Yalla Inquiry submit failed")
		frappe.local.response["http_status_code"] = 500
		return {"ok": 0, "code": "error"}

	return {"ok": 1, "code": "accepted"}


def _reject_bad_request():
	if not frappe.request:
		frappe.throw(frappe._("Unable to send right now."), frappe.ValidationError)

	if frappe.request.method != "POST":
		frappe.throw(frappe._("Unable to send right now."), frappe.PermissionError)

	content_type = (frappe.request.content_type or "").split(";")[0].strip().lower()
	allowed = {
		"application/json",
		"application/x-www-form-urlencoded",
		"multipart/form-data",
		"",
	}
	if content_type not in allowed:
		frappe.throw(frappe._("Unable to send right now."), frappe.ValidationError)


def _clean_text(value, limit):
	text = strip_html(str(value or "")).replace("\x00", "").strip()
	text = re.sub(r"\s+", " ", text)
	return text[:limit]


def _clean_email(value):
	email = _clean_text(value, MAX_EMAIL).lower()
	if not email:
		return ""
	if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
		return ""
	return email


def _clean_phone(value):
	raw = str(value or "").strip()
	raw = re.sub(r"[^\d+\s()-]", "", raw)
	raw = re.sub(r"\s+", " ", raw).strip()
	digits = re.sub(r"\D", "", raw)
	if len(digits) < 8 or len(digits) > 15:
		return ""
	return raw[:MAX_PHONE]


def _ip_hash():
	ip = getattr(frappe.local, "request_ip", None) or ""
	site = frappe.local.site if hasattr(frappe.local, "site") else "yb"
	return hashlib.sha256(f"{site}:{ip}".encode("utf-8")).hexdigest()[:40]


def _allow_rate(ip_hash):
	key = f"yb_inquiry_rate:{ip_hash}"
	count = cint(frappe.cache().get(key) or 0)
	if count >= RATE_LIMIT:
		return False
	frappe.cache().setex(key, RATE_WINDOW, count + 1)
	return True
