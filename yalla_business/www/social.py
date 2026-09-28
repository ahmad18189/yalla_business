# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Arabic-first conversion page for social and paid traffic."""

from __future__ import annotations

from yalla_business.www.showcase2 import DEFAULT_LANG, brand_mark_html, detect_lang, get_context as showcase_context

no_cache = 1
sitemap = 1

CANONICAL = "https://yallabusiness.ai/social"
OG_IMAGE = "https://yallabusiness.ai/assets/yalla_business/images/illustrations/hero-ecosystem.webp"


def get_context(context):
	showcase_context(context)
	lang = context.sm_lang or DEFAULT_LANG
	context.canonical = CANONICAL
	context.og_image = OG_IMAGE
	context.og_locale = "ar_SA" if lang == "ar" else "en_US"
	context.sm["home_href"] = "/"
	context.sm["cta_quote"] = "اطلب عرض سعر" if lang == "ar" else "Request a Quote"
	context.sm_brand_html = brand_mark_html(lang)
	context.no_cache = 1
	return context


__all__ = ["DEFAULT_LANG", "detect_lang", "get_context"]
