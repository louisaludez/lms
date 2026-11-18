function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    var expectedToken = PropertiesService.getScriptProperties()
      .getProperty('LUMINA_RELAY_TOKEN');
    if (!expectedToken) {
      return jsonResponse({ ok: false, error: 'Relay token is not configured.' });
    }

    var body = event && event.postData && event.postData.contents;
    if (!body) {
      return jsonResponse({ ok: false, error: 'Request body is required.' });
    }

    var payload = JSON.parse(body);
    if (!payload || payload.token !== expectedToken) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' });
    }
    if (
      typeof payload.to !== 'string' ||
      typeof payload.subject !== 'string' ||
      typeof payload.text !== 'string' ||
      typeof payload.html !== 'string'
    ) {
      return jsonResponse({ ok: false, error: 'Invalid email payload.' });
    }

    MailApp.sendEmail({
      to: payload.to,
      subject: payload.subject,
      body: payload.text,
      htmlBody: payload.html,
      name: 'Lumina Library',
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    var message = error && error.message
      ? error.message
      : 'Email sending failed.';
    return jsonResponse({ ok: false, error: message });
  }
}
