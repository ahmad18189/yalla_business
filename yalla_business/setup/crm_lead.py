# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Turn website Yalla Inquiry rows into Frappe CRM Leads."""

from __future__ import annotations

import frappe
from frappe.utils import cstr, escape_html

LEAD_SOURCE = "Website"

SERVICE_LABELS = {
	"marketing": "يلا ماركتنج",
	"erp": "يلا ERP بلس",
	"sign": "يلا ساين",
	"both": "ERP بلس وساين معاً",
	"ai": "يلا AI / كاتب",
	"consulting": "الاستشارات",
}


def ensure_lead_source():
	if not frappe.db.exists("DocType", "CRM Lead Source"):
		return None
	if frappe.db.exists("CRM Lead Source", LEAD_SOURCE):
		return LEAD_SOURCE
	doc = frappe.get_doc({"doctype": "CRM Lead Source", "source_name": LEAD_SOURCE})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return LEAD_SOURCE


def create_lead_from_inquiry(inquiry):
	if not frappe.db.exists("DocType", "CRM Lead"):
		return None

	ensure_lead_source()
	email = (inquiry.email or "").strip().lower()
	existing = None
	if email:
		existing = frappe.db.get_value(
			"CRM Lead",
			{"email": email, "converted": 0},
			"name",
		)

	if existing:
		_note_on_lead(existing, inquiry)
		_link_inquiry(inquiry, existing)
		return existing

	first_name, last_name = _split_name(inquiry.full_name)
	lead = frappe.get_doc(
		{
			"doctype": "CRM Lead",
			"first_name": first_name,
			"last_name": last_name or None,
			"email": email or None,
			"mobile_no": inquiry.phone or None,
			"phone": inquiry.phone or None,
			"organization": inquiry.company or None,
			"status": "New" if frappe.db.exists("CRM Lead Status", "New") else None,
			"source": LEAD_SOURCE if frappe.db.exists("CRM Lead Source", LEAD_SOURCE) else None,
			"company_description": _lead_description(inquiry),
		}
	)
	lead.flags.ignore_permissions = True
	lead.insert(ignore_permissions=True)
	_note_on_lead(lead.name, inquiry)
	_link_inquiry(inquiry, lead.name)
	frappe.db.commit()
	return lead.name


def backfill_inquiry_leads():
	if not frappe.db.exists("DocType", "Yalla Inquiry") or not frappe.db.exists("DocType", "CRM Lead"):
		return 0
	ensure_lead_source()
	created = 0
	names = frappe.get_all("Yalla Inquiry", pluck="name")
	has_link = frappe.get_meta("Yalla Inquiry").has_field("crm_lead")
	for name in names:
		doc = frappe.get_doc("Yalla Inquiry", name)
		if has_link and doc.crm_lead:
			continue
		if create_lead_from_inquiry(doc):
			created += 1
	return created


def _link_inquiry(inquiry, lead_name):
	if not inquiry or not lead_name:
		return
	if inquiry.meta.has_field("crm_lead") and inquiry.crm_lead != lead_name:
		frappe.db.set_value("Yalla Inquiry", inquiry.name, "crm_lead", lead_name, update_modified=False)
		inquiry.crm_lead = lead_name


def _split_name(full_name):
	parts = cstr(full_name).strip().split(None, 1)
	if not parts:
		return "Lead", ""
	if len(parts) == 1:
		return parts[0], ""
	return parts[0], parts[1]


def _lead_description(inquiry):
	service = SERVICE_LABELS.get(inquiry.service_interest, inquiry.service_interest or "")
	lines = [
		f"الخدمة: {service}",
		f"الخطة: {inquiry.plan_interest or ''}",
		f"المدة: {inquiry.plan_term or ''}",
		f"الصفحة: {inquiry.source_page or ''}",
		f"الحملة: {inquiry.utm_source or ''} / {inquiry.utm_medium or ''} / {inquiry.utm_campaign or ''}",
		"",
		cstr(inquiry.message or ""),
	]
	return "\n".join(lines).strip()[:1000]


def _note_on_lead(lead_name, inquiry):
	service = SERVICE_LABELS.get(inquiry.service_interest, inquiry.service_interest or "")
	body = "<br>".join(
		escape_html(line)
		for line in [
			f"طلب من الموقع — {inquiry.full_name}",
			f"الخدمة: {service}",
			f"الصفحة: {inquiry.source_page or ''}",
			cstr(inquiry.message or ""),
		]
		if line
	)
	if frappe.db.exists("DocType", "FCRM Note"):
		note = frappe.get_doc(
			{
				"doctype": "FCRM Note",
				"title": f"طلب موقع — {inquiry.full_name}",
				"content": f"<p>{body}</p>",
				"reference_doctype": "CRM Lead",
				"reference_docname": lead_name,
			}
		)
		note.insert(ignore_permissions=True)
		return
	frappe.get_doc(
		{
			"doctype": "Comment",
			"comment_type": "Info",
			"reference_doctype": "CRM Lead",
			"reference_name": lead_name,
			"content": body,
		}
	).insert(ignore_permissions=True)
