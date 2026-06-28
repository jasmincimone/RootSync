-- Service booking engine: Booking, availability, intake

ALTER TABLE "ServiceDetails" ADD COLUMN "fulfillmentMethod" TEXT NOT NULL DEFAULT 'VIRTUAL';
ALTER TABLE "ServiceDetails" ADD COLUMN "defaultTimeZone" TEXT NOT NULL DEFAULT 'America/New_York';

CREATE TABLE "ServiceAvailabilityRule" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAvailabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceIntakeQuestion" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceIntakeQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "memberEmail" TEXT NOT NULL,
    "memberName" TEXT,
    "vendorEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "serviceKind" TEXT NOT NULL,
    "fulfillmentMethod" TEXT NOT NULL DEFAULT 'VIRTUAL',
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
    "priceCents" INTEGER NOT NULL,
    "intakeNotes" TEXT,
    "vendorNotes" TEXT,
    "orderId" TEXT,
    "stripeSessionId" TEXT,
    "calendarEventId" TEXT,
    "calendarProvider" TEXT,
    "meetLink" TEXT,
    "calendarHtmlLink" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingIntakeAnswer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "BookingIntakeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Booking_orderId_key" ON "Booking"("orderId");
CREATE UNIQUE INDEX "Booking_stripeSessionId_key" ON "Booking"("stripeSessionId");
CREATE INDEX "Booking_listingId_idx" ON "Booking"("listingId");
CREATE INDEX "Booking_offeringId_idx" ON "Booking"("offeringId");
CREATE INDEX "Booking_memberUserId_idx" ON "Booking"("memberUserId");
CREATE INDEX "Booking_vendorProfileId_idx" ON "Booking"("vendorProfileId");
CREATE INDEX "Booking_scheduledStartAt_idx" ON "Booking"("scheduledStartAt");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

CREATE INDEX "ServiceAvailabilityRule_offeringId_idx" ON "ServiceAvailabilityRule"("offeringId");
CREATE INDEX "ServiceAvailabilityRule_offeringId_dayOfWeek_idx" ON "ServiceAvailabilityRule"("offeringId", "dayOfWeek");
CREATE INDEX "ServiceIntakeQuestion_offeringId_idx" ON "ServiceIntakeQuestion"("offeringId");
CREATE INDEX "BookingIntakeAnswer_bookingId_idx" ON "BookingIntakeAnswer"("bookingId");

ALTER TABLE "ServiceAvailabilityRule" ADD CONSTRAINT "ServiceAvailabilityRule_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceIntakeQuestion" ADD CONSTRAINT "ServiceIntakeQuestion_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingIntakeAnswer" ADD CONSTRAINT "BookingIntakeAnswer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
