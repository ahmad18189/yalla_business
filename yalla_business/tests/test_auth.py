# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from yalla_business.auth import CRM_HOME, DESK_HOME, is_crm_user, on_login, post_login_path


class TestLoginRedirect(IntegrationTestCase):
	def test_administrator_goes_to_desk(self):
		self.assertFalse(is_crm_user("Administrator"))
		self.assertEqual(post_login_path("Administrator"), DESK_HOME)

	def test_crm_default_app_goes_to_crm(self):
		email = "crm.route.test@example.com"
		self._delete_user(email)
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": "CRM",
				"last_name": "Route",
				"send_welcome_email": 0,
				"user_type": "System User",
				"default_app": "crm",
				"roles": [{"role": "Sales User"}],
			}
		).insert(ignore_permissions=True)
		try:
			self.assertTrue(is_crm_user(email))
			self.assertEqual(post_login_path(email), CRM_HOME)
			frappe.set_user(email)
			on_login()
			self.assertEqual(frappe.local.flags.home_page, CRM_HOME)
		finally:
			frappe.set_user("Administrator")
			self._delete_user(email)

	def test_system_manager_goes_to_desk_even_with_sales_roles(self):
		email = "desk.route.test@example.com"
		self._delete_user(email)
		frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": "Desk",
				"last_name": "Route",
				"send_welcome_email": 0,
				"user_type": "System User",
				"roles": [{"role": "System Manager"}, {"role": "Sales User"}],
			}
		).insert(ignore_permissions=True)
		try:
			self.assertFalse(is_crm_user(email))
			self.assertEqual(post_login_path(email), DESK_HOME)
			frappe.set_user(email)
			on_login()
			self.assertEqual(frappe.local.flags.home_page, DESK_HOME)
		finally:
			frappe.set_user("Administrator")
			self._delete_user(email)

	def _delete_user(self, email):
		if frappe.db.exists("User", email):
			frappe.delete_doc("User", email, force=True, ignore_permissions=True)
