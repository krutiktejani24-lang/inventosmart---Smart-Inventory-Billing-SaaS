-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "is_igst" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "place_of_supply" TEXT;
