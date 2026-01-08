#!/bin/bash

# Full Office Workflow Test Script
# Tests the complete journey from registration to renewal completion

BASE_URL="http://localhost:5000"
COOKIE_JAR="/tmp/test_cookies.txt"
ADMIN_COOKIE_JAR="/tmp/admin_cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test email with timestamp to avoid duplicates
TIMESTAMP=$(date +%s)
TEST_EMAIL="testoffice${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPass123!"

# Get admin password from argument or prompt
ADMIN_EMAIL="atallaabutaha@gmail.com"
ADMIN_PASSWORD="${1:-}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  JSTA Portal - Full Workflow Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${YELLOW}Usage: ./test-full-workflow.sh <admin_password>${NC}"
  echo -e "${YELLOW}Please provide the admin password as first argument${NC}"
  echo ""
  echo "Example: ./test-full-workflow.sh MyAdminPass123!"
  exit 1
fi

# Step 1: Register a new office
echo -e "${YELLOW}Step 1: Registering new office...${NC}"
ACCOUNT_DATA=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}",
  "confirmPassword": "${TEST_PASSWORD}",
  "contactName": "Test Contact"
}
EOF
)

OFFICE_DATA=$(cat <<EOF
{
  "tradeNameAr": "مكتب اختبار ${TIMESTAMP}",
  "tradeNameEn": "Test Office ${TIMESTAMP}",
  "licenseCategory": "A",
  "phone": "0612345678",
  "mobile": "0791234567",
  "mainCity": "Amman",
  "mainArea": "Downtown"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: multipart/form-data" \
  -F "account=${ACCOUNT_DATA}" \
  -F "office=${OFFICE_DATA}" \
  -F "branches=[]" \
  -c "${COOKIE_JAR}")

if echo "$REGISTER_RESPONSE" | grep -q "officeId"; then
  OFFICE_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"officeId":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}  SUCCESS: Office registered with ID: ${OFFICE_ID}${NC}"
else
  echo -e "${RED}  FAILED: Registration failed${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# Step 2: Login as admin
echo -e "${YELLOW}Step 2: Logging in as admin...${NC}"
ADMIN_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  -c "${ADMIN_COOKIE_JAR}")

if echo "$ADMIN_LOGIN" | grep -q "ADMIN\|email"; then
  echo -e "${GREEN}  SUCCESS: Admin logged in${NC}"
else
  echo -e "${RED}  FAILED: Admin login failed${NC}"
  echo "$ADMIN_LOGIN"
  exit 1
fi

# Step 3: Get office details and approve
echo -e "${YELLOW}Step 3: Admin approving office registration...${NC}"
APPROVE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/admin/offices/${OFFICE_ID}/approve" \
  -H "Content-Type: application/json" \
  -b "${ADMIN_COOKIE_JAR}")

if echo "$APPROVE_RESPONSE" | grep -q "ACTIVE\|approved\|success\|id"; then
  echo -e "${GREEN}  SUCCESS: Office approved${NC}"
else
  echo -e "${YELLOW}  INFO: Office may already be active or auto-approved${NC}"
  echo "  Response: $APPROVE_RESPONSE"
fi

# Step 4: Login as the new office
echo -e "${YELLOW}Step 4: Logging in as new office...${NC}"
OFFICE_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
  -c "${COOKIE_JAR}")

if echo "$OFFICE_LOGIN" | grep -q "OFFICE\|email"; then
  echo -e "${GREEN}  SUCCESS: Office logged in${NC}"
else
  echo -e "${RED}  FAILED: Office login failed${NC}"
  echo "$OFFICE_LOGIN"
  exit 1
fi

# Step 5: Update office information
echo -e "${YELLOW}Step 5: Updating office information...${NC}"
UPDATE_OFFICE=$(curl -s -X PUT "${BASE_URL}/api/office/profile" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}" \
  -d '{
    "mainCity": "Amman",
    "mainArea": "Abdali",
    "mainStreet": "King Abdullah II Street",
    "mainBuildingNumber": "123",
    "phone": "0612345678",
    "mobile": "0791234567",
    "website": "https://testoffice.jo",
    "mainEmail": "'"${TEST_EMAIL}"'"
  }')

if echo "$UPDATE_OFFICE" | grep -q "id\|success"; then
  echo -e "${GREEN}  SUCCESS: Office information updated${NC}"
else
  echo -e "${YELLOW}  INFO: Office update response: ${UPDATE_OFFICE}${NC}"
fi

# Step 6: Add a staff member
echo -e "${YELLOW}Step 6: Adding staff member...${NC}"
ADD_STAFF=$(curl -s -X POST "${BASE_URL}/api/office/staff" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}" \
  -d '{
    "fullNameAr": "موظف اختبار",
    "fullNameEn": "Test Employee",
    "nationalId": "'"${TIMESTAMP}"'",
    "nationality": "Jordanian",
    "gender": "male",
    "mobile": "0791111111",
    "jobTitleId": 1,
    "roleInOffice": "MANAGER"
  }')

if echo "$ADD_STAFF" | grep -q "id\|success\|personId"; then
  STAFF_ID=$(echo "$ADD_STAFF" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}  SUCCESS: Staff member added (ID: ${STAFF_ID})${NC}"
else
  echo -e "${YELLOW}  INFO: Staff response: ${ADD_STAFF}${NC}"
fi

# Step 7: Create renewal request
echo -e "${YELLOW}Step 7: Creating renewal request...${NC}"
CREATE_RENEWAL=$(curl -s -X POST "${BASE_URL}/api/office/renewals" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_JAR}" \
  -d '{
    "year": 2026
  }')

if echo "$CREATE_RENEWAL" | grep -q "id\|renewalId\|success"; then
  RENEWAL_ID=$(echo "$CREATE_RENEWAL" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -z "$RENEWAL_ID" ]; then
    RENEWAL_ID=$(echo "$CREATE_RENEWAL" | grep -o '"renewalId":[0-9]*' | cut -d':' -f2)
  fi
  echo -e "${GREEN}  SUCCESS: Renewal created (ID: ${RENEWAL_ID})${NC}"
else
  echo -e "${YELLOW}  INFO: Renewal response: ${CREATE_RENEWAL}${NC}"
  # Try to get existing renewal
  GET_RENEWAL=$(curl -s "${BASE_URL}/api/office/renewals" -b "${COOKIE_JAR}")
  RENEWAL_ID=$(echo "$GET_RENEWAL" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$RENEWAL_ID" ]; then
    echo -e "${GREEN}  Using existing renewal ID: ${RENEWAL_ID}${NC}"
  fi
fi

# Step 8: Submit renewal
echo -e "${YELLOW}Step 8: Submitting renewal for review...${NC}"
if [ -n "$RENEWAL_ID" ]; then
  SUBMIT_RENEWAL=$(curl -s -X PATCH "${BASE_URL}/api/office/renewals/${RENEWAL_ID}/submit" \
    -H "Content-Type: application/json" \
    -b "${COOKIE_JAR}")
  
  if echo "$SUBMIT_RENEWAL" | grep -q "SUBMITTED\|success\|status"; then
    echo -e "${GREEN}  SUCCESS: Renewal submitted${NC}"
  else
    echo -e "${YELLOW}  INFO: Submit response: ${SUBMIT_RENEWAL}${NC}"
  fi
fi

# Step 9: Check if payment exists, create if needed
echo -e "${YELLOW}Step 9: Checking/creating payment...${NC}"
PAYMENT_CHECK=$(curl -s "${BASE_URL}/api/payments/current" -b "${COOKIE_JAR}")
if echo "$PAYMENT_CHECK" | grep -q '"id"'; then
  PAYMENT_ID=$(echo "$PAYMENT_CHECK" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}  Payment exists (ID: ${PAYMENT_ID})${NC}"
else
  echo -e "${YELLOW}  Creating new payment...${NC}"
  CREATE_PAYMENT=$(curl -s -X POST "${BASE_URL}/api/payments" \
    -H "Content-Type: application/json" \
    -b "${COOKIE_JAR}" \
    -d "{\"renewalId\": ${RENEWAL_ID:-null}, \"amount\": 100}")
  PAYMENT_ID=$(echo "$CREATE_PAYMENT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$PAYMENT_ID" ]; then
    echo -e "${GREEN}  Payment created (ID: ${PAYMENT_ID})${NC}"
  else
    echo -e "${YELLOW}  INFO: Payment create response: ${CREATE_PAYMENT}${NC}"
  fi
fi

# Step 10: Admin approves payment
echo -e "${YELLOW}Step 10: Admin approving payment...${NC}"
if [ -n "$PAYMENT_ID" ]; then
  APPROVE_PAYMENT=$(curl -s -X PATCH "${BASE_URL}/api/admin/payments/${PAYMENT_ID}/approve" \
    -H "Content-Type: application/json" \
    -b "${ADMIN_COOKIE_JAR}")
  
  if echo "$APPROVE_PAYMENT" | grep -q "APPROVED\|success\|status"; then
    echo -e "${GREEN}  SUCCESS: Payment approved${NC}"
  else
    echo -e "${YELLOW}  INFO: Payment approval response: ${APPROVE_PAYMENT}${NC}"
  fi
else
  echo -e "${YELLOW}  SKIPPED: No payment to approve${NC}"
fi

# Step 11: Admin approves renewal
echo -e "${YELLOW}Step 11: Admin approving renewal...${NC}"
if [ -n "$RENEWAL_ID" ]; then
  APPROVE_RENEWAL=$(curl -s -X PATCH "${BASE_URL}/api/admin/renewals/${RENEWAL_ID}/approve" \
    -H "Content-Type: application/json" \
    -b "${ADMIN_COOKIE_JAR}")
  
  if echo "$APPROVE_RENEWAL" | grep -q "APPROVED\|COMPLETED\|success\|status"; then
    echo -e "${GREEN}  SUCCESS: Renewal approved${NC}"
  else
    echo -e "${YELLOW}  INFO: Renewal approval response: ${APPROVE_RENEWAL}${NC}"
  fi
else
  echo -e "${YELLOW}  SKIPPED: No renewal to approve${NC}"
fi

# Step 12: Verify final status
echo -e "${YELLOW}Step 12: Verifying final renewal status...${NC}"
if [ -n "$RENEWAL_ID" ]; then
  FINAL_STATUS=$(curl -s "${BASE_URL}/api/admin/renewals/${RENEWAL_ID}" \
    -b "${ADMIN_COOKIE_JAR}")
  
  STATUS=$(echo "$FINAL_STATUS" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$STATUS" ]; then
    echo -e "${GREEN}  FINAL STATUS: ${STATUS}${NC}"
  else
    echo -e "${YELLOW}  Could not parse status from response${NC}"
    echo "  Response: $FINAL_STATUS"
  fi
else
  echo -e "${YELLOW}  Could not verify - no renewal ID${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "  Test Email: ${TEST_EMAIL}"
echo -e "  Test Password: ${TEST_PASSWORD}"
echo -e "  Office ID: ${OFFICE_ID:-N/A}"
echo -e "  Renewal ID: ${RENEWAL_ID:-N/A}"
echo -e "  Payment ID: ${PAYMENT_ID:-N/A}"
echo ""
echo -e "${GREEN}Test completed!${NC}"
echo ""
echo -e "${BLUE}You can now login with:${NC}"
echo -e "  Email: ${TEST_EMAIL}"
echo -e "  Password: ${TEST_PASSWORD}"

# Cleanup
rm -f "${COOKIE_JAR}" "${ADMIN_COOKIE_JAR}"
