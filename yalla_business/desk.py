# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

"""Hide framework admin workspaces from the desk launcher for every user."""

from __future__ import annotations

import frappe

HIDDEN_WORKSPACE_LABELS = frozenset(
	{
		"Automation",
		"Build",
		"Email",
		"Integrations",
		"Organization",
		"Printing",
		"System",
		"Users",
		"Website",
	}
)


def extend_bootinfo(bootinfo):
	hide_launcher_workspaces(bootinfo)


def hide_launcher_workspaces(bootinfo=None):
	labels = HIDDEN_WORKSPACE_LABELS
	if bootinfo is not None:
		for icon in bootinfo.get("desktop_icons") or []:
			if (icon.get("label") or "") in labels:
				icon["hidden"] = 1
		_strip_sidebar(bootinfo.get("workspace_sidebar_item"), labels)
		return

	changed = False
	if frappe.db.exists("DocType", "Desktop Icon"):
		for row in frappe.get_all(
			"Desktop Icon",
			filters={"label": ["in", list(labels)]},
			fields=["name", "hidden"],
		):
			if row.hidden:
				continue
			frappe.db.set_value("Desktop Icon", row.name, "hidden", 1, update_modified=False)
			changed = True

	if frappe.db.exists("DocType", "Workspace"):
		for row in frappe.get_all(
			"Workspace",
			filters={"name": ["in", list(labels)]},
			fields=["name", "is_hidden"],
		):
			if row.is_hidden:
				continue
			frappe.db.set_value("Workspace", row.name, "is_hidden", 1, update_modified=False)
			changed = True

	if not changed:
		return
	_clear_desk_cache()


def _strip_sidebar(sidebar, labels):
	if not isinstance(sidebar, dict):
		return
	lower = {name.lower() for name in labels}
	for key in list(sidebar):
		if key in labels or str(key).lower() in lower:
			sidebar.pop(key, None)


def _clear_desk_cache():
	for key in ("desktop_icons", "bootinfo"):
		try:
			frappe.cache.delete_keys(key)
		except Exception:
			try:
				frappe.cache.delete_key(key)
			except Exception:
				pass
	try:
		frappe.clear_cache()
	except Exception:
		pass
