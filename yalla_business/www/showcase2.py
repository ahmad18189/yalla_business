# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Showcase 2 — original Yalla Business copy in the ERP Plus visual system."""

from __future__ import annotations

import frappe
from frappe.sessions import get_csrf_token
from frappe.utils import escape_html, now_datetime

no_cache = 1
sitemap = 0

LANGS = ("ar", "en")
DEFAULT_LANG = "ar"

PLAN_SEED = (
	{
		"plan_key": "lite",
		"title_ar": "الأساسية",
		"title_en": "Lite",
		"name": "Lite / Basic",
		"blurb_ar": "للمنشآت التي تحتاج الفوترة والمحاسبة الزكوية.",
		"blurb_en": "For simple businesses that need invoicing and zakat-oriented accounting.",
		"highlighted": 0,
		"highlight_label_ar": "باقة",
		"highlight_label_en": "Package",
		"features_ar": ["فوترة", "محاسبة زكوية"],
		"features_en": ["Invoicing", "Zakat-oriented accounting"],
		"prices": (
			{"term_months": 3, "total_sar": 450, "monthly_sar": 150, "discount_percent": 0},
			{"term_months": 6, "total_sar": 810, "monthly_sar": 135, "discount_percent": 10},
			{"term_months": 12, "total_sar": 1440, "monthly_sar": 120, "discount_percent": 20},
		),
	},
	{
		"plan_key": "standard",
		"title_ar": "الأعمال",
		"title_en": "Standard",
		"name": "Standard / Business",
		"blurb_ar": "للشركات الصغيرة والمتوسطة: محاسبة، مخزون، مبيعات، مشتريات، رواتب، موارد بشرية، وإدارة علاقات العملاء.",
		"blurb_en": "For SMEs: accounting, inventory, sales and purchasing, payroll and HR, plus CRM.",
		"highlighted": 1,
		"highlight_label_ar": "نوصي بها",
		"highlight_label_en": "Recommended",
		"features_ar": ["المحاسبة", "المخزون", "المبيعات والمشتريات", "الرواتب والموارد البشرية", "CRM"],
		"features_en": ["Accounting", "Inventory", "Sales and purchasing", "Payroll and HR", "CRM"],
		"prices": (
			{"term_months": 3, "total_sar": 1050, "monthly_sar": 350, "discount_percent": 0},
			{"term_months": 6, "total_sar": 1890, "monthly_sar": 315, "discount_percent": 10},
			{"term_months": 12, "total_sar": 3360, "monthly_sar": 280, "discount_percent": 20},
		),
	},
	{
		"plan_key": "professional",
		"title_ar": "الشاملة",
		"title_en": "Professional",
		"name": "Professional / Enterprise",
		"blurb_ar": "للشركات التي تحتاج النظام كاملاً مع مستوى أعلى من التخصيص.",
		"blurb_en": "For integrated companies that need the full system and high customization.",
		"highlighted": 0,
		"highlight_label_ar": "باقة",
		"highlight_label_en": "Package",
		"features_ar": ["كل قدرات النظام", "تخصيص أعلى"],
		"features_en": ["Full system capabilities", "High customization"],
		"prices": (
			{"term_months": 3, "total_sar": 1800, "monthly_sar": 600, "discount_percent": 0},
			{"term_months": 6, "total_sar": 3240, "monthly_sar": 540, "discount_percent": 10},
			{"term_months": 12, "total_sar": 5760, "monthly_sar": 480, "discount_percent": 20},
		),
	},
)

SIGN_PLAN_SEED = (
	{
		"plan_key": "sign_01",
		"title_ar": "الخطة 01",
		"title_en": "Plan 01",
		"name": "YallaSign 01",
		"blurb_ar": "للشركات التي تبدأ التوقيع الإلكتروني للعقود.",
		"blurb_en": "For teams starting with electronic contract signing.",
		"highlighted": 0,
		"highlight_label_ar": "باقة",
		"highlight_label_en": "Package",
		"limit_ar": "50 عقد شهرياً",
		"limit_en": "50 contracts per month",
		"features_ar": [
			"50 عقد شهرياً",
			"إدارة الصلاحيات",
			"تحكم كامل بالمستخدمين",
			"تقارير ومتابعة الاستخدام",
			"مرن وقابل للتوسع",
		],
		"features_en": [
			"50 contracts per month",
			"Permission management",
			"Full user control",
			"Usage reports and tracking",
			"Ready to scale",
		],
		"prices": (
			{"term_months": 1, "total_sar": 99, "monthly_sar": 99, "discount_percent": 0},
			{"term_months": 6, "total_sar": 534, "monthly_sar": 89, "discount_percent": 10},
			{"term_months": 12, "total_sar": 950, "monthly_sar": 79, "discount_percent": 20},
		),
	},
	{
		"plan_key": "sign_02",
		"title_ar": "الخطة 02",
		"title_en": "Plan 02",
		"name": "YallaSign 02",
		"blurb_ar": "لحجم أعلى من العقود مع تحكم أوضح بالفريق.",
		"blurb_en": "For a higher contract volume with clearer team control.",
		"highlighted": 1,
		"highlight_label_ar": "نوصي بها",
		"highlight_label_en": "Recommended",
		"limit_ar": "200 عقد شهرياً",
		"limit_en": "200 contracts per month",
		"features_ar": [
			"200 عقد شهرياً",
			"إدارة الصلاحيات",
			"تحكم كامل بالمستخدمين",
			"تقارير ومتابعة الاستخدام",
			"مرن وقابل للتوسع",
		],
		"features_en": [
			"200 contracts per month",
			"Permission management",
			"Full user control",
			"Usage reports and tracking",
			"Ready to scale",
		],
		"prices": (
			{"term_months": 1, "total_sar": 299, "monthly_sar": 299, "discount_percent": 0},
			{"term_months": 6, "total_sar": 1614, "monthly_sar": 269, "discount_percent": 10},
			{"term_months": 12, "total_sar": 2870, "monthly_sar": 239, "discount_percent": 20},
		),
	},
	{
		"plan_key": "sign_03",
		"title_ar": "الخطة 03",
		"title_en": "Plan 03",
		"name": "YallaSign 03",
		"blurb_ar": "للجهات التي تحتاج حجم عقود مرتفع مع حد يومي واضح.",
		"blurb_en": "For organizations that need high volume, with a clear daily cap.",
		"highlighted": 0,
		"highlight_label_ar": "باقة",
		"highlight_label_en": "Package",
		"limit_ar": "غير محدود — حد يومي 10,000 عقد",
		"limit_en": "Unlimited — 10,000 contracts daily cap",
		"features_ar": [
			"عقود غير محدودة شهرياً",
			"حد يومي 10,000 عقد",
			"إدارة الصلاحيات",
			"تحكم كامل بالمستخدمين",
			"تقارير ومتابعة الاستخدام",
			"مرن وقابل للتوسع",
		],
		"features_en": [
			"Unlimited contracts per month",
			"10,000 contracts daily cap",
			"Permission management",
			"Full user control",
			"Usage reports and tracking",
			"Ready to scale",
		],
		"prices": (
			{"term_months": 1, "total_sar": 1499, "monthly_sar": 1499, "discount_percent": 0},
			{"term_months": 6, "total_sar": 8094, "monthly_sar": 1349, "discount_percent": 10},
			{"term_months": 12, "total_sar": 14390, "monthly_sar": 1199, "discount_percent": 20},
		),
	},
)


def brand_mark_html(lang: str) -> str:
	if lang == "en":
		return "Ya<span>lla Business</span>"
	return escape_html("يلا") + " <span>" + escape_html("بزنس") + "</span>"


def detect_lang() -> str:
	lang = (frappe.form_dict.get("lang") or "").lower()
	if lang in LANGS:
		if getattr(frappe.local, "cookie_manager", None):
			frappe.local.cookie_manager.set_cookie("sm_lang", lang)
		return lang
	cookies = frappe.request.cookies if frappe.request else {}
	cookie = cookies.get("sm_lang") or ""
	if cookie in LANGS:
		return cookie
	return DEFAULT_LANG


def get_context(context):
	csrf_token = get_csrf_token()
	frappe.db.commit()

	lang = detect_lang()
	context.no_cache = 1
	context.csrf_token = csrf_token
	context.sm_lang = lang
	context.sm_dir = "rtl" if lang == "ar" else "ltr"
	context.year = now_datetime().year
	context.canonical = "https://showcase2.yallaerpplus.com/"
	context.yep_catalog = [dict(p) for p in PLAN_SEED]
	context.yep_catalog_json = frappe.as_json(context.yep_catalog)
	context.yep_sign_catalog = [dict(p) for p in SIGN_PLAN_SEED]
	context.yep_sign_catalog_json = frappe.as_json(context.yep_sign_catalog)
	context.sm_brand_html = brand_mark_html(lang)
	context.sm = {
		"lang": lang,
		"announcement": "كل أعمالكم في مكان واحد." if lang == "ar" else "All Business. One Place.",
		"nav_services": "الخدمات" if lang == "ar" else "Services",
		"nav_plans": "الخطط" if lang == "ar" else "Plans",
		"nav_why": "لماذا يلا بزنس" if lang == "ar" else "Why us",
		"nav_contact": "تواصل معنا" if lang == "ar" else "Contact",
		"nav_login": "دخول الموظفين" if lang == "ar" else "Staff login",
		"cta_quote": "اطلب عرض سعر" if lang == "ar" else "Request a Quote",
		"footer_copy": "يلا بزنس" if lang == "ar" else "Yalla Business AI",
		"footer_contact": "تواصل معنا" if lang == "ar" else "Contact",
		"contact_email": "info@yallabusiness.ai",
		"home_href": "/",
	}
	return context
