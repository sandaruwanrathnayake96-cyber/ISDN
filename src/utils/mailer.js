const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Simple log file for "Sent Emails"
const EMAIL_LOG_PATH = path.join(__dirname, '../../order_emails.log');
const CONFIG_PATH = path.join(__dirname, '../../email_config.json');

/**
 * Sends an order confirmation email to the customer.
 * @param {string} to - Customer email address
 * @param {Object} order - Order details { id, delivery_code, total_amount, items }
 */
async function sendOrderConfirmation(to, order) {
    if (!to) {
        console.log(`[Mailer] No email provided for Order #${order.id}. Skipping.`);
        return;
    }

    const itemsText = order.items.map(item =>
        `- ${item.name || 'Product'} (Qty: ${item.quantity}) - Rs. ${item.price.toFixed(2)}`
    ).join('\n');

    const emailBody = `
Order Confirmed! 

Thank you for your order. We are processing it right now.

DELIVERY VERIFICATION CODE: ${order.delivery_code}
(Show this code to the driver upon delivery)

DELIVERY DETAILS:
Address: ${order.delivery_address || 'Not provided'}
Contact: ${order.contact_number || 'Not provided'}

ORDER SUMMARY:
${itemsText}

TOTAL AMOUNT: Rs. ${order.total_amount.toFixed(2)}
`;

    // 1. Log locally always for audit
    const logBatch = `
============================================================
EMAIL TARGET: ${to}
SUBJECT: Order Confirmation - #${order.id}
DATE: ${new Date().toLocaleString()}
------------------------------------------------------------
${emailBody}
============================================================
`;
    console.log(`\n[SYSTEM] >>> Order Confirmation Triggered <<<`);
    console.log(logBatch);

    try {
        fs.appendFileSync(EMAIL_LOG_PATH, logBatch);
    } catch (err) {
        console.error('[Mailer] Failed to write to log file:', err);
    }

    // 2. Try to send real email if config exists and is valid
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (config.smtp_user && config.smtp_pass && config.smtp_host && !config.smtp_user.includes('your-email')) {
                console.log(`[Mailer] Attempting real SMTP send via PowerShell to ${to}...`);

                // Create a temporary PS1 file to avoid escaping issues in CLI
                const psScriptPath = path.join(__dirname, '../../temp_send_mail.ps1');
                const psScript = `
$pw = ConvertTo-SecureString "${config.smtp_pass}" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ("${config.smtp_user}", $pw)
$body = @"
${emailBody}
"@
Send-MailMessage -To "${to}" -From "${config.from_email || config.smtp_user}" -Subject "Order Confirmation - #${order.id}" -Body $body -SmtpServer "${config.smtp_host}" -Port ${config.smtp_port || 587} -Credential $cred -UseSsl
                `;

                fs.writeFileSync(psScriptPath, psScript);

                exec(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, (error, stdout, stderr) => {
                    // Delete temp script
                    try { fs.unlinkSync(psScriptPath); } catch (e) { /* ignore error */ }

                    if (error) {
                        console.error(`[Mailer] Real email sending failed:`, stderr || error.message);
                    } else {
                        console.log(`[Mailer] Real email SENT SUCCESSFULY to ${to}`);
                    }
                });
            } else {
                console.log('[Mailer] SMTP configuration found but not fully filled out. Staying in MOCK mode.');
            }
        } catch (err) {
            console.error('[Mailer] Error reading email config or sending via PS:', err.message);
        }
    } else {
        console.log('[Mailer] email_config.json not found. Running in MOCK mode (Check console for output).');
    }
}

module.exports = { sendOrderConfirmation };

