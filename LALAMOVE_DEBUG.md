# Simple approach: Fix the issue by not calling getQuotation again
# Instead, we should use the quotationId that was already obtained

# The problem: We're calling getQuotation() inside placeOrder which:
# 1. Creates a NEW quotation (different quotationId)  
# 2. The original quotation that was displayed to user is wasted
# 3. Lalamove might reject because quotationId doesn't match

# Solution: Pass the stops data from the frontend OR query Lalamove for quotation details

# Let me check what data the frontend has available...
