CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Otp_userId_channel_usedAt_expiresAt_idx" ON "Otp"("userId", "channel", "usedAt", "expiresAt");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");
