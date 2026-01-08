#!/bin/bash

# Office-Side Workflow Test Script
# Tests the office journey from registration through form completion

BASE_URL="http://localhost:5000"
COOKIE_JAR="/tmp/test_cookies.txt"

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  JSTA Portal - Office Workflow Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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

# Step 1b: Auto-approve office via direct DB for testing
echo -e "${YELLOW}Step 1b: Auto-approving office for testing...${NC}"
PGPASSWORD="${PGPASSWORD}" psql "${DATABASE_URL}" -c "UPDATE offices SET status = 'ACTIVE' WHERE id = ${OFFICE_ID};" 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "${GREEN}  SUCCESS: Office auto-approved${NC}"
else
  echo -e "${YELLOW}  INFO: Could not auto-approve (may need admin approval)${NC}"
fi

# Step 2: Login as the new office
echo -e "${YELLOW}Step 2: Logging in as new office...${NC}"
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

# Step 3: Get office profile
echo -e "${YELLOW}Step 3: Getting office profile...${NC}"
PROFILE=$(curl -s "${BASE_URL}/api/office/profile" -b "${COOKIE_JAR}")
if echo "$PROFILE" | grep -q "id"; then
  echo -e "${GREEN}  SUCCESS: Profile retrieved${NC}"
  OFFICE_STATUS=$(echo "$PROFILE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "  Office Status: ${OFFICE_STATUS:-PENDING}"
else
  echo -e "${YELLOW}  INFO: Profile response: ${PROFILE}${NC}"
fi

# Step 4: Update office information
echo -e "${YELLOW}Step 4: Updating office information...${NC}"
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

# Step 5: Get form completion status
echo -e "${YELLOW}Step 5: Checking form completion status...${NC}"
FORM_STATUS=$(curl -s "${BASE_URL}/api/office/form-completion-status" -b "${COOKIE_JAR}")
echo -e "${GREEN}  Form Status: ${FORM_STATUS}${NC}"

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
    "roleInOffice": "MANAGER"
  }')

if echo "$ADD_STAFF" | grep -q "id\|success\|personId"; then
  STAFF_ID=$(echo "$ADD_STAFF" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo -e "${GREEN}  SUCCESS: Staff member added${NC}"
else
  echo -e "${YELLOW}  INFO: Staff response: ${ADD_STAFF}${NC}"
fi

# Step 7: Get staff list
echo -e "${YELLOW}Step 7: Getting staff list...${NC}"
STAFF_LIST=$(curl -s "${BASE_URL}/api/office/staff" -b "${COOKIE_JAR}")
STAFF_COUNT=$(echo "$STAFF_LIST" | grep -o '"id":' | wc -l)
echo -e "${GREEN}  Staff count: ${STAFF_COUNT}${NC}"

# Step 8: Check current payment status
echo -e "${YELLOW}Step 8: Checking payment status...${NC}"
PAYMENT=$(curl -s "${BASE_URL}/api/payments/current" -b "${COOKIE_JAR}")
if echo "$PAYMENT" | grep -q '"id"'; then
  PAYMENT_STATUS=$(echo "$PAYMENT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}  Payment status: ${PAYMENT_STATUS}${NC}"
else
  echo -e "${YELLOW}  No payment found yet${NC}"
fi

# Step 9: Check renewal status
echo -e "${YELLOW}Step 9: Checking renewal status...${NC}"
RENEWALS=$(curl -s "${BASE_URL}/api/office/renewals" -b "${COOKIE_JAR}")
if echo "$RENEWALS" | grep -q '"id"'; then
  RENEWAL_ID=$(echo "$RENEWALS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  RENEWAL_STATUS=$(echo "$RENEWALS" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}  Renewal ID: ${RENEWAL_ID}, Status: ${RENEWAL_STATUS}${NC}"
else
  echo -e "${YELLOW}  No renewal found - office needs to be approved first${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary - Office Side Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "  Test Email: ${TEST_EMAIL}"
echo -e "  Test Password: ${TEST_PASSWORD}"
echo -e "  Office ID: ${OFFICE_ID:-N/A}"
echo ""
echo -e "${BLUE}Next Steps (require Admin):${NC}"
echo -e "  1. Admin approves office at /admin/offices/${OFFICE_ID}"
echo -e "  2. Office creates renewal at /office/renewals"
echo -e "  3. Office uploads payment proof at /office/payments"
echo -e "  4. Admin approves payment at /admin/payments"
echo -e "  5. Admin approves renewal at /admin/renewals"
echo ""
echo -e "${GREEN}Office-side workflow test completed!${NC}"
echo ""
echo -e "${BLUE}You can now login with:${NC}"
echo -e "  Email: ${TEST_EMAIL}"
echo -e "  Password: ${TEST_PASSWORD}"

# Cleanup
rm -f "${COOKIE_JAR}"
