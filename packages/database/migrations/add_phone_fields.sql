-- Add phone fields to Warehouse and Customer for Lalamove integration
-- Run this migration after adding phone fields to schema.prisma

ALTER TABLE Warehouse ADD COLUMN phone TEXT;
ALTER TABLE Customer ADD COLUMN phone TEXT;
