"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSmtpDeliveryEnabled = isSmtpDeliveryEnabled;
exports.getSmtpHost = getSmtpHost;
exports.getSmtpPort = getSmtpPort;
exports.getSmtpUser = getSmtpUser;
exports.getSmtpPass = getSmtpPass;
exports.getSmtpFrom = getSmtpFrom;
exports.isSmtpConfigured = isSmtpConfigured;
exports.getSmtpConfigSummary = getSmtpConfigSummary;
exports.assertSmtpReadyForSend = assertSmtpReadyForSend;
exports.formatSmtpError = formatSmtpError;
function isSmtpDeliveryEnabled() {
    return (process.env.NODE_ENV === 'production' || process.env.SMTP_SEND_IN_DEV === 'true');
}
function getSmtpHost() {
    return (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
}
function getSmtpPort() {
    const raw = (process.env.SMTP_PORT || '587').trim();
    const port = parseInt(raw, 10);
    return Number.isFinite(port) ? port : 587;
}
function getSmtpUser() {
    return (process.env.SMTP_USER || '').trim();
}
function getSmtpPass() {
    return (process.env.SMTP_PASS || '').trim();
}
function getSmtpFrom() {
    const raw = (process.env.SMTP_FROM || 'Hospital Santa Fe <noreply@hospitalsantafe.com>').trim();
    return raw.replace(/^["']|["']$/g, '');
}
function isSmtpConfigured() {
    return getSmtpUser().length > 0 && getSmtpPass().length > 0;
}
function getSmtpConfigSummary() {
    return {
        deliveryEnabled: isSmtpDeliveryEnabled(),
        configured: isSmtpConfigured(),
        host: getSmtpHost(),
        port: getSmtpPort(),
        user: getSmtpUser(),
        from: getSmtpFrom(),
    };
}
function assertSmtpReadyForSend() {
    if (!isSmtpDeliveryEnabled())
        return;
    if (!isSmtpConfigured()) {
        throw new Error('SMTP no configurado: defina SMTP_USER y SMTP_PASS en el .env del servidor (y reinicie hospitalsantafe-api).');
    }
}
function formatSmtpError(err) {
    if (!err || typeof err !== 'object')
        return 'Error desconocido al enviar correo';
    const e = err;
    const parts = [e.message, e.code, e.responseCode ? String(e.responseCode) : '', e.response]
        .filter(Boolean)
        .map((p) => String(p).trim());
    return parts.join(' — ') || 'Error desconocido al enviar correo';
}
//# sourceMappingURL=smtp.config.js.map