// Auto-triggered by Netlify on every form submission.
// Sends lead data to Google Apps Script for Google Sheet backup.
// Uses GET to avoid Google Apps Script POST redirect issues.

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzELKo-z_iv1uOZ11VnORBp0QCzaonYWTbh5l5B3ahtnX_ZvnYXYRvH6OL2f5bymwE4jA/exec";

exports.handler = async function (event) {
  try {
    const payload = JSON.parse(event.body).payload;

    const leadData = {
      form_name: payload.form_name,
      nom: payload.data.nom || "",
      prenom: payload.data.prenom || "",
      email: payload.data.email || "",
      telephone: payload.data.telephone || "",
      ville: payload.data.ville || "",
      prestation: payload.data.prestation || "",
      details: payload.data.details || "",
      created_at: payload.created_at,
      source_url: payload.data.referrer || "",
    };

    const url = `${GOOGLE_SCRIPT_URL}?action=addLead&data=${encodeURIComponent(JSON.stringify(leadData))}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Apps Script responded with ${response.status}`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("submission-created error:", error);
    return { statusCode: 200, body: "Error logged" };
  }
};
