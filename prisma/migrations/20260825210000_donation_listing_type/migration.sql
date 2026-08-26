-- Donation listing type detail table (suggested amounts reuse OfferingVariant).
CREATE TABLE "DonationDetails" (
    "offeringId" TEXT NOT NULL,
    "allowsCustomAmount" BOOLEAN NOT NULL DEFAULT true,
    "minAmountCents" INTEGER NOT NULL DEFAULT 100,
    "maxAmountCents" INTEGER,
    "thankYouMessage" TEXT,

    CONSTRAINT "DonationDetails_pkey" PRIMARY KEY ("offeringId")
);

ALTER TABLE "DonationDetails" ADD CONSTRAINT "DonationDetails_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
