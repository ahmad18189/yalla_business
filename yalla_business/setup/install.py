# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe


def after_install():
	_configure_website_settings()
	_configure_inquiry_options()
	_configure_email()
	_hide_admin_workspaces()


def after_migrate():
	_configure_website_settings()
	_configure_inquiry_options()
	_configure_email()
	_configure_crm_leads()
	_hide_admin_workspaces()


def _hide_admin_workspaces():
	from yalla_business.desk import hide_launcher_workspaces

	hide_launcher_workspaces()


def _configure_crm_leads():
	from yalla_business.setup.crm_lead import backfill_inquiry_leads, ensure_lead_source

	ensure_lead_source()
	backfill_inquiry_leads()


def _configure_website_settings():
	if not frappe.db.exists("DocType", "Website Settings"):
		return

	mark = "/assets/yalla_business/images/logo-mark.png"
	if "yalla_theme" in frappe.get_installed_apps():
		mark = "/assets/yalla_theme/icons/yalla-mark.png"

	ws = frappe.get_single("Website Settings")
	ws.disable_signup = 1
	ws.home_page = "showcase2"
	ws.app_name = "Yalla Business"
	ws.app_logo = mark
	if ws.meta.has_field("splash_image"):
		ws.splash_image = mark
	if ws.meta.has_field("banner_image"):
		ws.banner_image = mark
	if ws.meta.has_field("footer_logo"):
		ws.footer_logo = mark
	ws.favicon = "/assets/yalla_business/images/showcase2-favicon.svg"
	ws.flags.ignore_mandatory = True
	ws.save(ignore_permissions=True)

	if frappe.db.exists("DocType", "Navbar Settings"):
		nb = frappe.get_single("Navbar Settings")
		if nb.meta.has_field("app_logo"):
			nb.app_logo = mark
			nb.flags.ignore_mandatory = True
			nb.save(ignore_permissions=True)

	frappe.db.commit()


def _configure_inquiry_options():
	if not frappe.db.exists("DocType", "Yalla Inquiry"):
		return
	options = "\nmarketing\nerp\nsign\nboth\nai\nconsulting"
	frappe.db.set_value("DocField", {"parent": "Yalla Inquiry", "fieldname": "service_interest"}, "options", options)
	frappe.clear_cache(doctype="Yalla Inquiry")
	frappe.db.commit()


def _configure_email():
	from yalla_business.setup.email import ensure_info_email_account

	ensure_info_email_account()
