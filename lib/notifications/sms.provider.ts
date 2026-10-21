export async function sendSms(to: string, message: string): Promise<void> {
  // The SRS says multi-channel notification delivery should support SMS, but it's disabled for now.
  console.warn(`SMS functionality is currently disabled. Would have sent: "${message}" to ${to}`);
}
