
import "dotenv/config";
import { sendEmail } from "./lib/mailer.js";

async function main() {
  const recipient = process.env.SMTP_USER;

  if (!recipient) {
    throw new Error("SMTP_USER is missing from server/.env");
  }

  await sendEmail({
    to: recipient,
    subject: "The Grand Aurelia — Email Test",
    text: "Success! The Grand Aurelia booking email service is working.",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>The Grand Aurelia</h2>
        <p>Success! Your booking email service is working.</p>
      </div>
    `,
  });

  console.log("Test email sent successfully.");
}

main().catch((error: unknown) => {
  console.error("Email test failed:", error);
  process.exitCode = 1;
});
