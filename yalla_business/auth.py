# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Post-login routing for the public marketing site.

Website Settings home_page is showcase2 so https://yallabusiness.ai/ always
serves the public site — including for logged-in staff.

Do not return a desk route from get_website_user_home_page: Frappe uses that
value as the website path for `/`, which 404s (لم يتم العثور على).

After /login, CRM users go to /crm. Everyone else goes to /desk.
The login link itself has no redirect-to so the login form uses this path
instead of a hardcoded query argument.
"""

from __future__ import annotations

from urllib.parse import urlparse

import frappe

STAFF_LOGIN_PATH = "/login"
DESK_HOME = "/desk"
CRM_HOME = "/crm"
STAFF_HOME = "desk"

CRM_ROLES = ("Sales User", "Sales Manager")
DESK_ROLES = ("System Manager", "Administrator")
GENERIC_LOGIN_PATHS = {"", "/app", "/desk", "/apps"}


def get_website_user_home_page(user: str | None) -> str | None:
	return None


def is_crm_user(user: str | None) -> bool:
	if not user or user in ("Guest", "Administrator"):
		return False
	if not frappe.db.exists("User", user):
		return False
	default_app = frappe.db.get_value("User", user, "default_app")
	if default_app == "crm":
		return True
	if default_app:
		return False
	roles = set(frappe.get_roles(user))
	if roles.intersection(DESK_ROLES):
		return False
	return bool(roles.intersection(CRM_ROLES))


def post_login_path(user: str | None) -> str:
	return CRM_HOME if is_crm_user(user) else DESK_HOME


def login_redirect():
	"""Used when a signed-in user hits /login with no specific destination."""
	user = frappe.session.user
	if not user or user == "Guest":
		return None
	if frappe.db.get_value("User", user, "user_type") != "System User":
		return None
	return post_login_path(user)


def on_login(login_manager=None):
	user = getattr(login_manager, "user", None) or frappe.session.user
	if not user or user == "Guest":
		return
	if frappe.db.get_value("User", user, "user_type") != "System User":
		return
	if _explicit_login_redirect():
		return
	path = post_login_path(user)
	frappe.local.flags.home_page = path
	if not frappe.cache.hget("redirect_after_login", user):
		frappe.cache.hset("redirect_after_login", user, path)


def _explicit_login_redirect() -> str | None:
	request = getattr(frappe.local, "request", None)
	raw = None
	if request is not None:
		raw = request.args.get("redirect-to")
	if not raw:
		raw = frappe.form_dict.get("redirect_to")
	if not raw:
		return None
	try:
		from frappe.www.login import sanitize_redirect

		cleaned = sanitize_redirect(raw)
	except Exception:
		cleaned = raw
	if not cleaned:
		return None
	path = urlparse(cleaned).path if "://" in str(cleaned) else cleaned
	path = (path or "").rstrip("/")
	if path in GENERIC_LOGIN_PATHS:
		return None
	return cleaned
