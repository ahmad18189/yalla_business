# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe

no_cache = 1
sitemap = 1


def get_context(context):
	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()

	context.no_cache = 1
	context.csrf_token = csrf_token
	context.year = frappe.utils.now_datetime().year
	context.canonical = "https://yallabusiness.milestoneksa.com/"
	context.site_name = "Yalla Business AI"
	return context
