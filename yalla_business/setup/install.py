# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe


def after_install():
	_configure_website_settings()


def after_migrate():
	_configure_website_settings()


def _configure_website_settings():
	if not frappe.db.exists("DocType", "Website Settings"):
		return

	ws = frappe.get_single("Website Settings")
	ws.disable_signup = 1
	ws.home_page = "index"
	ws.app_name = "Yalla Business"
	ws.app_logo = "/assets/yalla_business/images/logo-header.webp"
	ws.favicon = "/assets/yalla_business/images/favicon-32.png"
	ws.flags.ignore_mandatory = True
	ws.save(ignore_permissions=True)
	frappe.db.commit()
