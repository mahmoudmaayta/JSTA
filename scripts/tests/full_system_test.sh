#!/bin/bash

# Full System Test Script for JSTA Portal
# This script tests the complete workflow from registration to renewal approval

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
TIMESTAMP=$(date +%s)
ADMIN_EMAIL="atallaabutaha@gmail.com"
ADMIN_PASSWORD="Admin123"

# Generate unique test data
TEST_EMAIL="test.office.${TIMESTAMP}@demo.com"
TEST_PASSWORD="TestPass123!"

echo "=================================================="
echo "JSTA Portal - Full System Test"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Create a temp directory for test files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Create a dummy test file for uploads
echo "Test document content" > "$TEMP_DIR/test_doc.pdf"

# Function to make API calls and extract values
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie=$4
    
    if [ -n "$cookie" ]; then
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Cookie: $cookie" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Cookie: $cookie"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint"
        fi
    fi
}

# Login and get session cookie
login_and_get_cookie() {
    local email=$1
    local password=$2
    
    RESP=$(curl -s -i -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    # Extract Set-Cookie header
    COOKIE=$(echo "$RESP" | grep -i "set-cookie" | head -1 | sed 's/.*: //' | cut -d';' -f1)
    echo "$COOKIE"
}

echo "STEP 1: Register New Office"
echo "----------------------------"

# Prepare registration data
ACCOUNT_DATA=$(cat <<EOF
{
    "email": "$TEST_EMAIL",
    "password": "$TEST_PASSWORD",
    "confirmPassword": "$TEST_PASSWORD",
    "contactName": "محمد أحمد الفلسطيني"
}
EOF
)

OFFICE_DATA=$(cat <<EOF
{
    "tradeNameAr": "شركة النور للسياحة والسفر",
    "tradeNameEn": "Al-Noor Tourism & Travel",
    "legalNameAr": "شركة النور للسياحة والسفر ذ.م.م",
    "nationalEntityNo": "12345678",
    "trademark": "النور",
    "awqafApprovalNo": "AWQ-2024-001",
    "licenseNo": "MOT-2024-${TIMESTAMP}",
    "licenseIssueDate": "2024-01-01",
    "licenseExpiryDate": "2026-12-31",
    "commercialNo": "COM-${TIMESTAMP}",
    "ibanNo": "JO94CBJO0010000000000131000302",
    "locationX": "31.9539",
    "locationY": "35.9106",
    "building": "مبنى رقم 15",
    "streetAr": "شارع الملك عبدالله الثاني",
    "districtAr": "عبدون",
    "cityAr": "عمان",
    "countryAr": "الأردن",
    "streetEn": "King Abdullah II Street",
    "districtEn": "Abdoun",
    "cityEn": "Amman",
    "countryEn": "Jordan",
    "phone": "00962612345678",
    "fax": "00962612345679",
    "mobile": "00962791234567",
    "email": "info@alnoor-tourism.jo",
    "website": "www.alnoor-tourism.jo",
    "postalCode": "11183",
    "poBox": "1234"
}
EOF
)

BRANCHES_DATA='[]'

# Make registration request (multipart form data)
REG_RESP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -F "account=$ACCOUNT_DATA" \
    -F "office=$OFFICE_DATA" \
    -F "branches=$BRANCHES_DATA")

echo "Registration Response: $REG_RESP"

OFFICE_ID=$(echo "$REG_RESP" | grep -o '"officeId":[0-9]*' | cut -d':' -f2)

if [ -z "$OFFICE_ID" ]; then
    echo "ERROR: Failed to get office ID from registration"
    exit 1
fi

echo "Office created with ID: $OFFICE_ID"
echo ""

echo "STEP 2: Login as Admin and Approve Office"
echo "-------------------------------------------"

ADMIN_COOKIE=$(login_and_get_cookie "$ADMIN_EMAIL" "$ADMIN_PASSWORD")

if [ -z "$ADMIN_COOKIE" ]; then
    echo "ERROR: Failed to login as admin"
    exit 1
fi

echo "Admin logged in successfully"

# Approve the office
APPROVE_RESP=$(api_call "POST" "/api/admin/offices/$OFFICE_ID/approve" "" "$ADMIN_COOKIE")
echo "Approve Response: $APPROVE_RESP"

# Logout admin
api_call "POST" "/api/auth/logout" "" "$ADMIN_COOKIE" > /dev/null

echo ""

echo "STEP 3: Login as Office User"
echo "-----------------------------"

OFFICE_COOKIE=$(login_and_get_cookie "$TEST_EMAIL" "$TEST_PASSWORD")

if [ -z "$OFFICE_COOKIE" ]; then
    echo "ERROR: Failed to login as office user"
    exit 1
fi

echo "Office user logged in successfully"

# Verify profile
PROFILE_RESP=$(api_call "GET" "/api/office/profile" "" "$OFFICE_COOKIE")
echo "Office Profile: $PROFILE_RESP" | head -c 200
echo "..."
echo ""

echo "STEP 4: Create 2026 Renewal"
echo "---------------------------"

RENEWAL_RESP=$(api_call "POST" "/api/office/renewals-2026" "" "$OFFICE_COOKIE")
echo "Create Renewal Response: $RENEWAL_RESP"

RENEWAL_ID=$(echo "$RENEWAL_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$RENEWAL_ID" ]; then
    echo "ERROR: Failed to get renewal ID"
    exit 1
fi

echo "Renewal created with ID: $RENEWAL_ID"
echo ""

echo "STEP 5: Complete Office Info Form"
echo "-----------------------------------"

OFFICE_FORM_DATA=$(cat <<EOF
{
    "officeData": {
        "tradeNameAr": "شركة النور للسياحة والسفر",
        "tradeNameEn": "Al-Noor Tourism & Travel",
        "legalNameAr": "شركة النور للسياحة والسفر ذ.م.م",
        "nationalEntityNo": "12345678",
        "trademark": "النور",
        "awqafApprovalNo": "AWQ-2024-001",
        "licenseNo": "MOT-2024-${TIMESTAMP}",
        "licenseIssueDate": "2024-01-01",
        "licenseExpiryDate": "2026-12-31",
        "commercialNo": "COM-${TIMESTAMP}",
        "ibanNo": "JO94CBJO0010000000000131000302",
        "building": "مبنى رقم 15",
        "streetAr": "شارع الملك عبدالله الثاني",
        "districtAr": "عبدون",
        "cityAr": "عمان",
        "countryAr": "الأردن",
        "streetEn": "King Abdullah II Street",
        "districtEn": "Abdoun",
        "cityEn": "Amman",
        "countryEn": "Jordan",
        "phone": "00962612345678",
        "fax": "00962612345679",
        "mobile": "00962791234567",
        "email": "info@alnoor-tourism.jo",
        "website": "www.alnoor-tourism.jo"
    },
    "branches": []
}
EOF
)

OFFICE_FORM_RESP=$(api_call "POST" "/api/office/renewals-2026/$RENEWAL_ID/form-office" "$OFFICE_FORM_DATA" "$OFFICE_COOKIE")
echo "Office Form Response: $OFFICE_FORM_RESP"
echo ""

echo "STEP 6: Complete Staff Form"
echo "----------------------------"

STAFF_FORM_DATA=$(cat <<EOF
{
    "staffList": [
        {
            "fullNameAr": "محمد أحمد الفلسطيني",
            "fullNameEn": "Mohammad Ahmad Al-Falastini",
            "nationalId": "9801234567",
            "socialSecurityNo": "SS-123456",
            "nationality": "JO",
            "gender": "male",
            "motherName": "فاطمة",
            "mobile": "0791234567",
            "birthDate": "1985-06-15",
            "currentPosition": "مدير عام",
            "startDate": "2020-01-01",
            "branch": "main",
            "roleType": "OWNER_MANAGER"
        },
        {
            "fullNameAr": "أحمد خالد العبدالله",
            "fullNameEn": "Ahmad Khaled Al-Abdullah",
            "nationalId": "9807654321",
            "socialSecurityNo": "SS-654321",
            "nationality": "JO",
            "gender": "male",
            "motherName": "نور",
            "mobile": "0797654321",
            "birthDate": "1990-03-20",
            "currentPosition": "موظف حجوزات",
            "startDate": "2022-06-01",
            "branch": "main",
            "roleType": "EMPLOYEE"
        }
    ]
}
EOF
)

STAFF_FORM_RESP=$(api_call "POST" "/api/office/renewals-2026/$RENEWAL_ID/form-staff" "$STAFF_FORM_DATA" "$OFFICE_COOKIE")
echo "Staff Form Response: $STAFF_FORM_RESP"
echo ""

echo "STEP 7: Complete Commitment Form"
echo "-----------------------------------"

COMMITMENT_FORM_DATA=$(cat <<EOF
{
    "consents": ["DATA_ACCURACY", "TERMS_ACCEPTANCE", "ANTI_FRAUD", "MINISTRY_AUTHORIZATION"],
    "complaintNumbers": "",
    "notes": "اختبار النظام الكامل"
}
EOF
)

COMMITMENT_FORM_RESP=$(api_call "POST" "/api/office/renewals-2026/$RENEWAL_ID/form-commitment" "$COMMITMENT_FORM_DATA" "$OFFICE_COOKIE")
echo "Commitment Form Response: $COMMITMENT_FORM_RESP"
echo ""

echo "STEP 8: Upload Required Attachments"
echo "-------------------------------------"

# Upload Pack 1 - Financial Docs
echo "Uploading PACK_1_FINANCIAL_DOCS..."
curl -s -X POST "$BASE_URL/api/office/renewals-2026/$RENEWAL_ID/attachments" \
    -H "Cookie: $OFFICE_COOKIE" \
    -F "file=@$TEMP_DIR/test_doc.pdf" \
    -F "category=PACK_1_FINANCIAL_DOCS"
echo ""

# Upload Pack 2 - Legal Docs
echo "Uploading PACK_2_LEGAL_DOCS..."
curl -s -X POST "$BASE_URL/api/office/renewals-2026/$RENEWAL_ID/attachments" \
    -H "Cookie: $OFFICE_COOKIE" \
    -F "file=@$TEMP_DIR/test_doc.pdf" \
    -F "category=PACK_2_LEGAL_DOCS"
echo ""

# Upload Pack 3 - Insurance Docs
echo "Uploading PACK_3_INSURANCE_DOCS..."
curl -s -X POST "$BASE_URL/api/office/renewals-2026/$RENEWAL_ID/attachments" \
    -H "Cookie: $OFFICE_COOKIE" \
    -F "file=@$TEMP_DIR/test_doc.pdf" \
    -F "category=PACK_3_INSURANCE_DOCS"
echo ""

echo "STEP 9: Verify Renewal Status"
echo "-------------------------------"

RENEWAL_STATUS=$(api_call "GET" "/api/office/renewals-2026/$RENEWAL_ID" "" "$OFFICE_COOKIE")
echo "Renewal Status: $RENEWAL_STATUS" | head -c 500
echo "..."
echo ""

echo "STEP 10: Submit Renewal for Admin Review"
echo "-----------------------------------------"

SUBMIT_RESP=$(api_call "POST" "/api/office/renewals-2026/$RENEWAL_ID/submit" "" "$OFFICE_COOKIE")
echo "Submit Response: $SUBMIT_RESP"
echo ""

# Logout office user
api_call "POST" "/api/auth/logout" "" "$OFFICE_COOKIE" > /dev/null

echo "STEP 11: Admin Review and Approve Renewal"
echo "-------------------------------------------"

ADMIN_COOKIE=$(login_and_get_cookie "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
echo "Admin logged in"

# Get pending renewals
PENDING_RENEWALS=$(api_call "GET" "/api/admin/renewals?status=PENDING_REVIEW" "" "$ADMIN_COOKIE")
echo "Pending Renewals: $PENDING_RENEWALS" | head -c 300
echo "..."
echo ""

# Approve the renewal for download
APPROVE_RENEWAL_RESP=$(api_call "POST" "/api/admin/renewals/$RENEWAL_ID/approve" "" "$ADMIN_COOKIE")
echo "Approve Renewal Response: $APPROVE_RENEWAL_RESP"
echo ""

echo "=================================================="
echo "TEST COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "Summary:"
echo "  - Office ID: $OFFICE_ID"
echo "  - Test Email: $TEST_EMAIL"
echo "  - Password: $TEST_PASSWORD"
echo "  - Renewal ID: $RENEWAL_ID"
echo ""
echo "You can now login with these credentials to verify the UI."
