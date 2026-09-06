// Copyright (c) 2026, Milestone KSA and contributors
// For license information, please see license.txt

frappe.ui.form.on("Yalla Inquiry", {
	refresh(frm) {
		frm.set_df_property("ip_hash", "read_only", 1);
		frm.set_df_property("user_agent", "read_only", 1);
	},
});
