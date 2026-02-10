// Auto-triggered by Netlify on every form submission.
// Sends lead data to Google Apps Script for Google Sheet backup.

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

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

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addLead", data: leadData }),
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with ${response.status}`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("submission-created error:", error);
    return { statusCode: 200, body: "Error logged" };
  }
};
