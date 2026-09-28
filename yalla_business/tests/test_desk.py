# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from yalla_business.desk import HIDDEN_WORKSPACE_LABELS, hide_launcher_workspaces


class TestHiddenWorkspaces(IntegrationTestCase):
	def test_selected_launcher_tiles_are_hidden(self):
		boot = frappe._dict(
			desktop_icons=[
				{"label": "Automation", "hidden": 0},
				{"label": "Build", "hidden": 0},
				{"label": "Email", "hidden": 0},
				{"label": "Integrations", "hidden": 0},
				{"label": "Organization", "hidden": 0},
				{"label": "Printing", "hidden": 0},
				{"label": "System", "hidden": 0},
				{"label": "Users", "hidden": 0},
				{"label": "Website", "hidden": 0},
				{"label": "Accounting", "hidden": 0},
				{"label": "Data", "hidden": 0},
			],
			workspace_sidebar_item={
				"automation": {"name": "Automation"},
				"users": {"name": "Users"},
				"accounting": {"name": "Accounting"},
			},
		)
		hide_launcher_workspaces(boot)
		hidden = {row["label"]: row["hidden"] for row in boot.desktop_icons}
		for label in HIDDEN_WORKSPACE_LABELS:
			self.assertEqual(hidden[label], 1, label)
		self.assertEqual(hidden["Accounting"], 0)
		self.assertEqual(hidden["Data"], 0)
		self.assertNotIn("automation", boot.workspace_sidebar_item)
		self.assertNotIn("users", boot.workspace_sidebar_item)
		self.assertIn("accounting", boot.workspace_sidebar_item)
