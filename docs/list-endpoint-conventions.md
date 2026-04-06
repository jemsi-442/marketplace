# List Endpoint Conventions

## Goal

Keep list-style API endpoints consistent across the marketplace so frontend lanes can share the same pagination, filtering, and summary patterns.

This applies to endpoints such as:

1. `client requests`
2. `vendor requests`
3. `admin requests`
4. `bookings`
5. `thread summaries`
6. `notifications`
7. `admin users`
8. `withdrawals`

## Standard Query Params

List endpoints should prefer these query parameters:

1. `page`
   - 1-based page number
   - values above the last page should clamp to the last page

2. `limit`
   - page size
   - should be bounded server-side

3. `search`
   - free-text filter
   - should be trimmed server-side

4. `view`
   - named filter for the current lane
   - examples:
     - `all`
     - `active`
     - `awaiting_payment`
     - `unread`
     - `vendor`
     - `processing`

Legacy aliases may remain temporarily for compatibility, but new frontend work should prefer `view`.

## Standard Response Shape

Paginated list endpoints should return:

1. `items`
2. `page`
3. `page_size`
4. `total_items`
5. `total_pages`
6. `summary`

Example shape:

```json
{
  "items": [],
  "page": 1,
  "page_size": 10,
  "total_items": 0,
  "total_pages": 1,
  "summary": {}
}
```

## Pagination Rules

Pagination should follow these rules:

1. `page` is always at least `1`
2. `total_pages` is always at least `1`
3. if `page > total_pages`, clamp to `total_pages`
4. empty results should still return:
   - `page = 1`
   - `total_pages = 1`
   - `items = []`

Shared helper:

1. [ListQueryParamsTrait.php](/home/jaykali/marketplace/backend/src/Controller/Concerns/ListQueryParamsTrait.php)

## Summary Rules

`summary` should represent the whole filtered search scope for the lane, not just the current page.

Examples:

1. requests
   - `total`
   - `active`
   - `awaiting_payment`
   - `completed`

2. bookings
   - `total`
   - `active`
   - `protected`
   - `unread`

3. notifications
   - `total`
   - `unread`
   - `visible`

4. admin users
   - `total`
   - `clients`
   - `vendors`
   - `admins`
   - `locked`
   - `unverified`

5. withdrawals
   - `total`
   - `pending`
   - `processing`
   - `paid`
   - `failed`

Summary keys may vary by lane, but the enclosing field name should remain `summary`.

## Filtering Rules

When a lane supports a named tab or chip filter, prefer putting it behind `view`.

Examples:

1. requests
   - `view=active`
   - `view=awaiting_payment`

2. bookings
   - `view=protected`
   - `view=unread`

3. notifications
   - `view=unread`

4. withdrawals
   - `view=processing`

Additional lane-specific params are fine when they express something different from `view`, for example:

1. `category` for notifications
2. another explicit foreign-key filter if needed later

## Implementation Notes

When building a new list endpoint:

1. use `ListQueryParamsTrait`
2. calculate `total_items` before fetching page items
3. clamp page against total pages
4. fetch only current-page rows
5. compute `summary` from the filtered lane scope, not from page items
6. keep search and view logic backend-side
7. avoid returning oversized full datasets for frontend slicing

## Test Coverage

Primary regression coverage:

1. [ListEndpointsFlowTest.php](/home/jaykali/marketplace/backend/tests/Api/ListEndpointsFlowTest.php)

This suite currently covers:

1. paginated response shape
2. `view` filters
3. `search`
4. empty results
5. invalid `view` fallback
6. last-page behavior
7. `page > total_pages` clamping

Run it with:

```bash
cd /home/jaykali/marketplace/backend
composer test:api:lists
```

## Current Reference Endpoints

Useful examples in the codebase:

1. [ClientRequestController.php](/home/jaykali/marketplace/backend/src/Controller/Api/ClientRequestController.php)
2. [AdminClientRequestController.php](/home/jaykali/marketplace/backend/src/Controller/Api/AdminClientRequestController.php)
3. [VendorRequestFeedController.php](/home/jaykali/marketplace/backend/src/Controller/Api/VendorRequestFeedController.php)
4. [BookingController.php](/home/jaykali/marketplace/backend/src/Controller/Api/BookingController.php)
5. [MessageController.php](/home/jaykali/marketplace/backend/src/Controller/MessageController.php)
6. [NotificationController.php](/home/jaykali/marketplace/backend/src/Controller/NotificationController.php)
7. [AdminController.php](/home/jaykali/marketplace/backend/src/Controller/Api/AdminController.php)
8. [WithdrawalController.php](/home/jaykali/marketplace/backend/src/Controller/Api/WithdrawalController.php)
