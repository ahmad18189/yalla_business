# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

from pathlib import Path

import frappe
from frappe.tests import IntegrationTestCase

from yalla_business.www.social import CANONICAL, DEFAULT_LANG


class TestSocialLanding(IntegrationTestCase):
	def test_default_language_is_arabic(self):
		self.assertEqual(DEFAULT_LANG, "ar")
		self.assertEqual(CANONICAL, "https://yallabusiness.ai/social")

	def test_page_is_arabic_first_with_inquiry_form(self):
		html = Path(frappe.get_app_path("yalla_business", "www", "social.html")).read_text()
		self.assertIn('id="ybsForm"', html)
		self.assertIn('id="ybs-inquiry"', html)
		self.assertIn("اطلب عرض سعر", html)
		self.assertIn("جاهزون نبدأ؟", html)
		self.assertIn('data-service="marketing"', html)
		self.assertIn('data-service="erp"', html)
		self.assertIn('data-service="sign"', html)
		self.assertIn('lang="{{ sm_lang }}"', html)
		self.assertIn('dir="{{ sm_dir }}"', html)

	def test_inquiry_js_tracks_current_path(self):
		js = Path(frappe.get_app_path("yalla_business", "public", "js", "showcase2.js")).read_text()
		self.assertIn("location.pathname", js)
		self.assertIn("preselectFromQuery", js)
		self.assertNotIn('data.source_page = "/showcase2"', js)

	def test_staff_login_goes_to_desk_not_crm(self):
		from yalla_business.auth import (
			CRM_HOME,
			DESK_HOME,
			STAFF_HOME,
			get_website_user_home_page,
			is_crm_user,
			login_redirect,
			on_login,
			post_login_path,
		)

		html = Path(frappe.get_app_path("yalla_business", "www", "showcase2.html")).read_text()
		self.assertIn("sm.login_href", html)
		self.assertNotIn('href="/login"', html)
		self.assertEqual(STAFF_HOME, "desk")
		self.assertIsNone(get_website_user_home_page("Guest"))
		self.assertIsNone(get_website_user_home_page(None))
		self.assertIsNone(get_website_user_home_page("Administrator"))
		self.assertFalse(is_crm_user("Administrator"))
		self.assertFalse(is_crm_user("Guest"))
		self.assertEqual(post_login_path("Administrator"), DESK_HOME)
		self.assertEqual(DESK_HOME, "/desk")
		self.assertEqual(CRM_HOME, "/crm")
		self.assertTrue(callable(on_login))
		self.assertTrue(callable(login_redirect))

	def test_inquiry_tracking_is_wired(self):
		from yalla_business.www.submit_inquiry import _clean_extra

		js = Path(frappe.get_app_path("yalla_business", "public", "js", "inquiry-track.js")).read_text()
		self.assertIn("utm_source", js)
		self.assertIn("document.referrer", js)
		self.assertIn("ybInquiryTracking", js)
		self.assertIn("yb_attrib", js)

		social = Path(frappe.get_app_path("yalla_business", "www", "social.html")).read_text()
		self.assertIn("inquiry-track.js", social)

		doc = Path(frappe.get_app_path("yalla_business", "www", "submit_inquiry.py")).read_text()
		self.assertIn("utm_source", doc)
		self.assertIn("landing_page", doc)
		self.assertIn("referrer", doc)
		self.assertIn("extra_data", doc)

		schema = Path(
			frappe.get_app_path("yalla_business", "yalla_business", "doctype", "yalla_inquiry", "yalla_inquiry.json")
		).read_text()
		self.assertIn('"utm_source"', schema)
		self.assertIn('"referrer"', schema)
		self.assertIn('"extra_data"', schema)

		self.assertIsNone(_clean_extra("not-json"))
		self.assertEqual(_clean_extra({"utm_source": "instagram"})["utm_source"], "instagram")

	def test_google_workspace_info_mailbox(self):
		from yalla_business.setup.email import INFO_EMAIL, ensure_info_email_account

		src = Path(frappe.get_app_path("yalla_business", "setup", "email.py")).read_text()
		self.assertIn("smtp-relay.gmail.com", src)
		self.assertIn(INFO_EMAIL, src)
		self.assertIn("no_smtp_authentication", src)
		self.assertIn("force_workspace_relay", src)
		self.assertTrue(callable(ensure_info_email_account))

	def test_inquiry_creates_crm_lead(self):
		from yalla_business.setup.crm_lead import create_lead_from_inquiry, ensure_lead_source

		src = Path(frappe.get_app_path("yalla_business", "setup", "crm_lead.py")).read_text()
		self.assertIn("CRM Lead", src)
		self.assertIn("create_lead_from_inquiry", src)
		self.assertTrue(callable(create_lead_from_inquiry))
		self.assertTrue(callable(ensure_lead_source))

		inquiry_py = Path(
			frappe.get_app_path("yalla_business", "yalla_business", "doctype", "yalla_inquiry", "yalla_inquiry.py")
		).read_text()
		self.assertIn("create_lead_from_inquiry", inquiry_py)
