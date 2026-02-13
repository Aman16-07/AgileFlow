#!/usr/bin/env bash
# ============================================================
# AgileFlow API Test Suite
# ============================================================
# Usage:  chmod +x test-api.sh && ./test-api.sh
#   or:   bash test-api.sh
#
# Prerequisites:
#   - Backend running on http://localhost:4000
#   - curl and jq installed
#
# Environment variables (override defaults):
#   BASE_URL    - Backend URL (default: http://localhost:4000)
#   AUTH_TOKEN  - Bearer token  (default: demo-token)
#   SPACE_KEY   - Space key     (default: DESIGN)
# ============================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
AUTH_TOKEN="${AUTH_TOKEN:-demo-token}"
SPACE_KEY="${SPACE_KEY:-DESIGN}"

PASS=0
FAIL=0
TOTAL=0
CREATED_TASK_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ── Helpers ──────────────────────────────────────────────────

auth_header="Authorization: Bearer ${AUTH_TOKEN}"
content_type="Content-Type: application/json"

# Run a test: test_endpoint "NAME" "METHOD" "URL" [body]
# Checks for HTTP 2xx and optionally validates with jq expression
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local jq_check="${5:-}"

  TOTAL=$((TOTAL + 1))
  local num
  num=$(printf "%02d" "$TOTAL")

  local response
  local http_code

  if [ -n "$body" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "$auth_header" -H "$content_type" \
      -d "$body" \
      "${BASE_URL}${url}" 2>/dev/null) || true
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "$auth_header" -H "$content_type" \
      "${BASE_URL}${url}" 2>/dev/null) || true
  fi

  http_code=$(echo "$response" | tail -1)
  local body_response
  body_response=$(echo "$response" | sed '$d')

  # Check HTTP status
  if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
    # If jq check provided, validate response body
    if [ -n "$jq_check" ]; then
      local check_result
      check_result=$(echo "$body_response" | jq -r "$jq_check" 2>/dev/null) || check_result=""
      if [ -n "$check_result" ] && [ "$check_result" != "null" ] && [ "$check_result" != "" ]; then
        echo -e "  ${GREEN}✓${NC} ${num} ${name} ${CYAN}[${http_code}]${NC} → ${check_result}"
        PASS=$((PASS + 1))
      else
        echo -e "  ${RED}✗${NC} ${num} ${name} ${CYAN}[${http_code}]${NC} → jq check failed"
        FAIL=$((FAIL + 1))
      fi
    else
      local preview
      preview=$(echo "$body_response" | jq -c '.' 2>/dev/null | head -c 100) || preview="(raw response)"
      echo -e "  ${GREEN}✓${NC} ${num} ${name} ${CYAN}[${http_code}]${NC} → ${preview}"
      PASS=$((PASS + 1))
    fi
  else
    echo -e "  ${RED}✗${NC} ${num} ${name} ${RED}[${http_code}]${NC}"
    echo "    Response: $(echo "$body_response" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi

  # Export body for chained tests
  LAST_RESPONSE="$body_response"
}

# ── Pre-flight Check ────────────────────────────────────────

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  AgileFlow API Test Suite${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Base URL:   ${CYAN}${BASE_URL}${NC}"
echo -e "  Auth Token: ${CYAN}${AUTH_TOKEN:0:10}...${NC}"
echo ""

# Check backend is reachable
if ! curl -s --max-time 3 "${BASE_URL}/" > /dev/null 2>&1; then
  echo -e "  ${RED}ERROR: Backend not reachable at ${BASE_URL}${NC}"
  echo "  Start the backend first: cd backend && npm run start:dev"
  exit 1
fi

# ── Section 1: Health & Infrastructure ──────────────────────

echo -e "${YELLOW}▸ Health & Infrastructure${NC}"

test_endpoint "GET / (root health)"    GET "/" "" '.status'
test_endpoint "GET /health (detailed)" GET "/health" "" '.status'

# ── Section 2: Dashboard ────────────────────────────────────

echo ""
echo -e "${YELLOW}▸ Dashboard${NC}"

test_endpoint "GET /dashboard/for-you" GET "/api/v1/dashboard/for-you" "" \
  '"\(.recentSpaces | length) spaces, \(.workedOn | length) worked-on, \(.activityFeed | length) activities"'

# ── Section 3: Space ────────────────────────────────────────

echo ""
echo -e "${YELLOW}▸ Spaces${NC}"

test_endpoint "GET /spaces/:key" GET "/api/v1/spaces/${SPACE_KEY}" "" '.name'

# Extract space ID for subsequent tests
SPACE_ID=$(echo "$LAST_RESPONSE" | jq -r '.id' 2>/dev/null)
if [ -z "$SPACE_ID" ] || [ "$SPACE_ID" = "null" ]; then
  echo -e "  ${RED}ERROR: Could not extract space ID. Remaining tests will fail.${NC}"
  SPACE_ID="unknown"
fi

# ── Section 4: Sprints ──────────────────────────────────────

echo ""
echo -e "${YELLOW}▸ Sprints${NC}"

test_endpoint "GET /sprints (list)" GET "/api/v1/spaces/${SPACE_ID}/sprints" "" \
  '"count=\(length)"'

# Extract an active or first sprint ID
SPRINT_ID=$(echo "$LAST_RESPONSE" | jq -r '[.[] | select(.status=="ACTIVE")] | first // first | .id' 2>/dev/null)
if [ -z "$SPRINT_ID" ] || [ "$SPRINT_ID" = "null" ]; then
  SPRINT_ID=$(echo "$LAST_RESPONSE" | jq -r 'first | .id' 2>/dev/null)
fi

# ── Section 5: Board View ───────────────────────────────────

echo ""
echo -e "${YELLOW}▸ Board View${NC}"

test_endpoint "GET /boards/view (auto sprint)" GET "/api/v1/spaces/${SPACE_ID}/boards/view" "" \
  '"\(.columns | length) columns, workflow=\(.workflow.name)"'

# Extract status IDs from board columns for later use
TODO_STATUS_ID=$(echo "$LAST_RESPONSE" | jq -r '[.columns[] | select(.category=="TODO")] | first | .id' 2>/dev/null)
IN_PROGRESS_STATUS_ID=$(echo "$LAST_RESPONSE" | jq -r '[.columns[] | select(.category=="IN_PROGRESS")] | first | .id' 2>/dev/null)

# ── Section 6: Workflow Statuses ─────────────────────────────

echo ""
echo -e "${YELLOW}▸ Workflows${NC}"

test_endpoint "GET /workflow/statuses" GET "/api/v1/spaces/${SPACE_ID}/workflows/statuses" "" \
  '"count=\(length)"'

# ── Section 7: Tasks (Read) ─────────────────────────────────

echo ""
echo -e "${YELLOW}▸ Tasks (Read)${NC}"

test_endpoint "GET /tasks (all in space)" GET "/api/v1/tasks?spaceId=${SPACE_ID}" "" \
  '"\(.items | length) items, hasMore=\(.hasMore)"'

test_endpoint "GET /tasks (backlog only)" GET "/api/v1/tasks?spaceId=${SPACE_ID}&sprintId=backlog" "" \
  '"\(.items | length) backlog items"'

# Extract a task ID for detail tests
TASK_ID=$(echo "$LAST_RESPONSE" | jq -r '.items | first | .id' 2>/dev/null)
if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  # Fallback: get from all tasks
  TASK_ID=$(curl -s -H "$auth_header" "${BASE_URL}/api/v1/tasks?spaceId=${SPACE_ID}" | jq -r '.items | first | .id' 2>/dev/null)
fi

test_endpoint "GET /tasks/:id (detail)" GET "/api/v1/tasks/${TASK_ID}" "" \
  '"\(.title) [\(.key)] status=\(.status.name)"'

# ── Section 8: Comments & Activities ─────────────────────────

echo ""
echo -e "${YELLOW}▸ Comments & Activities${NC}"

test_endpoint "GET /comments (for task)" GET "/api/v1/tasks/${TASK_ID}/comments" "" \
  '"\(.items | length) comments, hasMore=\(.hasMore)"'

test_endpoint "GET /activities (for task)" GET "/api/v1/activities/task/${TASK_ID}" "" \
  '"\(.items | length) activities, hasMore=\(.hasMore)"'

test_endpoint "GET /activities/me" GET "/api/v1/activities/me" ""

# ── Section 9: Stars & Recents ───────────────────────────────

echo ""
echo -e "${YELLOW}▸ Stars & Recents${NC}"

test_endpoint "GET /stars"   GET "/api/v1/stars"   "" '"count=\(length)"'
test_endpoint "GET /recents" GET "/api/v1/recents" "" '"count=\(length)"'

# ── Section 10: Mutations (CRUD) ─────────────────────────────

echo ""
echo -e "${YELLOW}▸ Mutations (Create → Move → Update → Comment → Delete)${NC}"

# 10a. Create task
test_endpoint "POST /tasks (create)" POST "/api/v1/tasks" \
  "{\"spaceId\":\"${SPACE_ID}\",\"statusId\":\"${TODO_STATUS_ID}\",\"title\":\"curl-test-$(date +%s)\"}" \
  '"\(.key) created in \(.status.name)"'

CREATED_TASK_ID=$(echo "$LAST_RESPONSE" | jq -r '.id' 2>/dev/null)

# 10b. Move task to In Progress
if [ -n "$CREATED_TASK_ID" ] && [ "$CREATED_TASK_ID" != "null" ]; then
  test_endpoint "PATCH /tasks/move (→ In Progress)" PATCH "/api/v1/tasks/move" \
    "{\"taskId\":\"${CREATED_TASK_ID}\",\"targetStatusId\":\"${IN_PROGRESS_STATUS_ID}\",\"targetPosition\":0}" \
    '"moved to \(.status.name)"'

  # 10c. Update task
  test_endpoint "PATCH /tasks/:id (update priority+sp)" PATCH "/api/v1/tasks/${CREATED_TASK_ID}" \
    '{"priority":"HIGH","storyPoints":5}' \
    '"priority=\(.priority) sp=\(.storyPoints)"'

  # 10d. Add comment
  test_endpoint "POST /comments (add)" POST "/api/v1/tasks/${CREATED_TASK_ID}/comments" \
    '{"content":"Automated test comment"}' \
    '.content'

  # 10e. Delete task (cleanup)
  test_endpoint "DELETE /tasks/:id (cleanup)" DELETE "/api/v1/tasks/${CREATED_TASK_ID}"
else
  echo -e "  ${RED}Skipping mutation tests — task creation failed${NC}"
  FAIL=$((FAIL + 5))
  TOTAL=$((TOTAL + 5))
fi

# ── Section 11: AI Sprint Summary ────────────────────────────

echo ""
echo -e "${YELLOW}▸ AI Sprint Summary${NC}"

if [ -n "$SPRINT_ID" ] && [ "$SPRINT_ID" != "null" ]; then
  test_endpoint "POST /ai/sprint-summary/:id" POST "/api/v1/ai/sprint-summary/${SPRINT_ID}" '{}' \
    '.summary | .[0:80]'
else
  echo -e "  ${YELLOW}⊘ Skipped (no sprint found)${NC}"
fi

# ── Section 12: Frontend Health ──────────────────────────────

echo ""
echo -e "${YELLOW}▸ Frontend${NC}"

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TOTAL=$((TOTAL + 1))
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$FRONTEND_URL" 2>/dev/null) || http_code="000"
num=$(printf "%02d" "$TOTAL")
if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
  echo -e "  ${GREEN}✓${NC} ${num} Frontend reachable ${CYAN}[${http_code}]${NC}"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} ${num} Frontend unreachable ${RED}[${http_code}]${NC}"
  FAIL=$((FAIL + 1))
fi

# ── Summary ──────────────────────────────────────────────────

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}ALL ${TOTAL} TESTS PASSED ✓${NC}"
else
  echo -e "  ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}  out of ${TOTAL} total"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit "$FAIL"
