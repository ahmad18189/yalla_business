# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import hashlib
import re

import frappe
from frappe.utils import cint, now, strip_html

no_cache = 1

SERVICE_ALLOWLIST = {"erp", "sign", "both", "ai", "marketing", "consulting"}
PLAN_ALLOWLIST = {"", "lite", "standard", "professional", "sign_01", "sign_02", "sign_03"}
TERM_ALLOWLIST = {"", "1", "3", "6", "12"}
LANG_ALLOWLIST = {"", "ar", "en"}

MAX_NAME = 120
MAX_COMPANY = 160
MAX_EMAIL = 140
MAX_PHONE = 40
MAX_MESSAGE = 2000
MAX_SOURCE = 200
MAX_UTM = 120
MAX_CLICK = 200
MAX_REFERRER = 400
MAX_LANDING = 300
MAX_COUNTRY = 80
MAX_TZ = 80
MAX_EXTRA = 4000
RATE_LIMIT = 5
RATE_WINDOW = 3600

COUNTRY_HEADERS = (
	"CF-IPCountry",
	"CloudFront-Viewer-Country",
	"X-AppEngine-Country",
	"X-Country-Code",
	"X-Geo-Country",
)


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
	landing_page=None,
	referrer=None,
	utm_source=None,
	utm_medium=None,
	utm_campaign=None,
	utm_term=None,
	utm_content=None,
	click_id=None,
	client_timezone=None,
	extra_data=None,
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
	landing_page = _clean_text(landing_page, MAX_LANDING)
	referrer = _clean_text(referrer, MAX_REFERRER)
	utm_source = _clean_slug(utm_source, MAX_UTM)
	utm_medium = _clean_slug(utm_medium, MAX_UTM)
	utm_campaign = _clean_slug(utm_campaign, MAX_UTM)
	utm_term = _clean_text(utm_term, MAX_UTM)
	utm_content = _clean_text(utm_content, MAX_UTM)
	click_id = _clean_text(click_id, MAX_CLICK)
	client_timezone = _clean_text(client_timezone, MAX_TZ)
	extra_data = _clean_extra(extra_data)
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
	country = _request_country()

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
		doc.landing_page = landing_page or None
		doc.referrer = referrer or None
		doc.utm_source = utm_source or None
		doc.utm_medium = utm_medium or None
		doc.utm_campaign = utm_campaign or None
		doc.utm_term = utm_term or None
		doc.utm_content = utm_content or None
		doc.click_id = click_id or None
		doc.country = country or None
		doc.client_timezone = client_timezone or None
		doc.extra_data = extra_data or None
		doc.status = "New"
		doc.submitted_at = now()
		doc.ip_hash = ip_hash
		doc.user_agent = user_agent
		doc.flags.ignore_permissions = True
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		from yalla_business.setup.email import notify_new_inquiry

		notify_new_inquiry(doc)
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


def _clean_slug(value, limit):
	text = _clean_text(value, limit)
	return text[:limit]


def _clean_extra(value):
	if value is None or value == "":
		return None
	if isinstance(value, (dict, list)):
		raw = frappe.as_json(value)
	else:
		raw = str(value)
	raw = raw.replace("\x00", "").strip()
	if len(raw) > MAX_EXTRA:
		raw = raw[:MAX_EXTRA]
	try:
		parsed = frappe.parse_json(raw)
	except Exception:
		return None
	if not isinstance(parsed, (dict, list)):
		return None
	return parsed


def _request_country():
	headers = getattr(frappe.request, "headers", None)
	if not headers:
		return ""
	for name in COUNTRY_HEADERS:
		value = (headers.get(name) or "").strip().upper()
		if value and value not in {"XX", "ZZ", "T1"}:
			return value[:MAX_COUNTRY]
	return ""


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
