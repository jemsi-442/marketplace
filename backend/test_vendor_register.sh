#!/bin/bash

BASE_URL="http://localhost:8000/api"
EMAIL="vendor_test_$(date +%s)@test.com"
PASSWORD="Password123!"
TYPE="vendor"

echo "=== STEP 1: Vendor Register ==="
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"type\":\"$TYPE\"}")

echo "Register Response: $REGISTER_RESPONSE"

# Extract user ID and JWT token
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id // empty')
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$USER_ID" ] || [ -z "$TOKEN" ]; then
    echo "Registration failed or JWT not returned. Exiting."
    exit 1
fi

echo "Registered User ID: $USER_ID"
echo "JWT Token: $TOKEN"

echo "=== STEP 2: Get Vendor Profile (Authenticated) ==="
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/vendor/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Vendor Profile Response: $PROFILE_RESPONSE"
