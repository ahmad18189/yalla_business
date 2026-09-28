// Copyright (c) 2026, Milestone KSA and contributors
// For license information, please see license.txt

frappe.ui.form.on("Yalla Inquiry", {
	refresh(frm) {
		[
			"ip_hash",
			"user_agent",
			"landing_page",
			"referrer",
			"utm_source",
			"utm_medium",
			"utm_campaign",
			"utm_term",
			"utm_content",
			"click_id",
			"country",
			"client_timezone",
			"extra_data",
		].forEach((field) => frm.set_df_property(field, "read_only", 1));
	},
});
