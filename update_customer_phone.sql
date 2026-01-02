# Quick SQL to add customer phone
# Run this in Prisma Studio's SQL query tab or via sqlite3

# Update the customer with ID 552a699f-417e-467c-b895-8cae73f0a9b7
# Set phone to +6281234567891

UPDATE Customer
SET phone = '+6281234567891'
WHERE id = '552a699f-417e-467c-b895-8cae73f0a9b7';
