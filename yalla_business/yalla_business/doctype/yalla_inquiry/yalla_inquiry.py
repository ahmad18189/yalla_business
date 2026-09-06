# Copyright (c) 2026, Milestone KSA and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class YallaInquiry(Document):
	def before_insert(self):
		if not self.status:
			self.status = "New"
		if not self.submitted_at:
			self.submitted_at = frappe.utils.now()
