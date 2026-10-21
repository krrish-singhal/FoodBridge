export const generateFoodBridgeEmail = (title: string, message: string, ctaText?: string, ctaLink?: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #0f172a;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #166534; /* Green 800 */
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 32px 24px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      color: #166534; /* Green 800 */
    }
    .message {
      font-size: 16px;
      line-height: 1.5;
      color: #334155;
      margin-bottom: 24px;
    }
    .cta-container {
      text-align: center;
      margin-top: 32px;
    }
    .cta-button {
      background-color: #eab308; /* Yellow 500 */
      color: #166534; /* Green 800 */
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      display: inline-block;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FoodBridge</h1>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      <div class="message">${message.replace(/\n/g, '<br/>')}</div>
      ${ctaText && ctaLink ? `
      <div class="cta-container">
        <a href="${ctaLink}" class="cta-button">${ctaText}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>FoodBridge - Connecting surplus food with those in need.</p>
      <p>This is an automated message, please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
`;

export const verificationStatusEmail = (orgName: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
  const title = status === 'APPROVED' ? 'Organization Verified' : 'Verification Update';
  const message = status === 'APPROVED' 
    ? `Hello ${orgName},\n\nGood news! Your organization has been successfully verified on FoodBridge. You can now participate in our network.\n\nThank you for joining our mission to reduce food waste.`
    : `Hello ${orgName},\n\nRegarding your verification request on FoodBridge, we have an update. Unfortunately, we could not approve your request at this time.\n\nReason: ${reason || 'Please contact support for more details.'}`;
  const ctaText = status === 'APPROVED' ? 'Go to Dashboard' : undefined;
  const ctaLink = status === 'APPROVED' ? 'https://foodbridge.example.com/dashboard' : undefined;
  
  return generateFoodBridgeEmail(title, message, ctaText, ctaLink);
};

export const matchAcceptedEmail = (ngoName: string, foodName: string, pickupTime: string, pickupAddress: string) => {
  const title = 'Donation Match Accepted';
  const message = `Great news! Your donation for "${foodName}" has been accepted by ${ngoName}.\n\nPlease ensure the food is ready for pickup by ${pickupTime} at ${pickupAddress}.`;
  return generateFoodBridgeEmail(title, message, 'View Details', 'https://foodbridge.example.com/dashboard');
};

export const expiryAlertEmail = (foodName: string, timeRemaining: string) => {
  const title = 'Urgent: Donation Expiring Soon';
  const message = `Your donation "${foodName}" is expiring in ${timeRemaining}. If it has not been picked up yet, please take necessary action to ensure food safety.`;
  return generateFoodBridgeEmail(title, message, 'View Donation', 'https://foodbridge.example.com/dashboard');
};

