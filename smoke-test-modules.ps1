$b = "http://localhost:5000/api"

function Req {
  param($method, $url, $tok, $body)
  try {
    $h = @{ Authorization = "Bearer $tok" }
    if ($body) {
      Invoke-RestMethod -Method $method -Uri $url -ContentType "application/json" -Headers $h -Body ($body | ConvertTo-Json -Compress)
    } else {
      Invoke-RestMethod -Method $method -Uri $url -Headers $h
    }
  } catch {
    if ($_.Exception.Response) {
      $r = $_.Exception.Response
      $s = [int]$r.StatusCode
      $t = (New-Object System.IO.StreamReader($r.GetResponseStream())).ReadToEnd()
      throw "HTTP $s | $t"
    } else { throw $_.Exception.Message }
  }
}

$pass = 0; $fail = 0
function Pass($l) { Write-Host "[PASS] $l" -ForegroundColor Green; $script:pass++ }
function Fail($l, $e) { Write-Host "[FAIL] $l => $e" -ForegroundColor Red; $script:fail++ }

# ─── Setup ────────────────────────────────────────────────────────────────────
$admin  = Req POST "$b/auth/login" "" @{ identifier = "admin@society.local";  password = "Pass@123" }
$aT     = $admin.accessToken
$member = Req POST "$b/auth/login" "" @{ identifier = "member@society.local"; password = "Pass@123" }
$mT     = $member.accessToken
$grd    = Req POST "$b/auth/login" "" @{ identifier = "guard@society.local";  password = "Pass@123" }
$gT     = $grd.accessToken
$flats  = Req GET "$b/admin/flats" $aT
$fId    = $flats[0].id
Write-Host "Setup OK | flatId=$fId" -ForegroundColor Cyan

# ─── Frequent Visitors / Domestic Staff ──────────────────────────────────────
$fv = $null
try { $fv = Req POST "$b/modules/staff" $mT @{ name="Sunita Bai"; phone="9876543001"; category="MAID" }; Pass "POST /modules/staff (member)            => id=$($fv.id) cat=$($fv.category)" } catch { Fail "POST /modules/staff" $_ }
try { $r = Req GET  "$b/modules/staff" $aT; Pass "GET  /modules/staff (admin)             => $($r.Count) staff" } catch { Fail "GET  /modules/staff" $_ }
if ($fv) {
  try { $r = Req PATCH "$b/modules/staff/$($fv.id)" $mT @{ isActive=$true }; Pass "PATCH /modules/staff/:id (member)        => active=$($r.isActive)" } catch { Fail "PATCH /modules/staff/:id" $_ }
}

# ─── Staff Attendance ─────────────────────────────────────────────────────────
if ($fv) {
  try { $r = Req POST "$b/modules/staff/checkin"  $gT @{ frequentVisitorId=$fv.id }; Pass "POST /modules/staff/checkin (guard)      => id=$($r.id)" } catch { Fail "POST /modules/staff/checkin" $_ }
  try { $r = Req GET  "$b/modules/staff/attendance" $gT; Pass "GET  /modules/staff/attendance (guard)   => $($r.Count) records" } catch { Fail "GET  /modules/staff/attendance" $_ }
  try { $r = Req POST "$b/modules/staff/checkout" $gT @{ frequentVisitorId=$fv.id }; Pass "POST /modules/staff/checkout (guard)     => out=$($r.checkedOutAt -ne $null)" } catch { Fail "POST /modules/staff/checkout" $_ }
}

# ─── Visitor OTP Invite ───────────────────────────────────────────────────────
$inv = $null
try {
  $from  = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $until = [DateTime]::UtcNow.AddHours(4).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $inv = Req POST "$b/modules/invites" $mT @{ guestName="Raj Sharma"; guestPhone="9123400001"; purpose="Plumber visit"; validFrom=$from; validUntil=$until }
  Pass "POST /modules/invites (member)             => otp=$($inv.otp) id=$($inv.id)"
} catch { Fail "POST /modules/invites" $_ }

try { $r = Req GET "$b/modules/invites" $mT; Pass "GET  /modules/invites (member)           => $($r.Count) invites" } catch { Fail "GET  /modules/invites" $_ }

if ($inv) {
  try {
    $r = Req POST "$b/modules/invites/verify" $gT @{ otp=$inv.otp }
    Pass "POST /modules/invites/verify (guard)      => guest=$($r.invite.guestName) logId=$($r.visitorLog.id)"
  } catch { Fail "POST /modules/invites/verify" $_ }
}

# ─── Amenities ────────────────────────────────────────────────────────────────
$am = $null
try { $am = Req POST "$b/modules/amenities" $aT @{ name="Swimming Pool"; description="Rooftop pool"; capacity=3 }; Pass "POST /modules/amenities (admin)          => id=$($am.id)" } catch { Fail "POST /modules/amenities" $_ }
try { $r = Req GET  "$b/modules/amenities" $mT; Pass "GET  /modules/amenities (member)         => $($r.Count) amenities" } catch { Fail "GET  /modules/amenities" $_ }
if ($am) {
  try { $r = Req PATCH "$b/modules/amenities/$($am.id)" $aT @{ capacity=5 }; Pass "PATCH /modules/amenities/:id (admin)     => capacity=$($r.capacity)" } catch { Fail "PATCH /modules/amenities/:id" $_ }
}

# ─── Amenity Bookings ─────────────────────────────────────────────────────────
$bk = $null
if ($am) {
  try {
    $bookDate = [DateTime]::UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $bk = Req POST "$b/modules/amenity-bookings" $mT @{ amenityId=$am.id; date=$bookDate; startTime="09:00"; endTime="10:00"; notes="Morning swim" }
    Pass "POST /modules/amenity-bookings (member)   => id=$($bk.id) status=$($bk.status)"
  } catch { Fail "POST /modules/amenity-bookings" $_ }

  try { $r = Req GET "$b/modules/amenity-bookings" $mT; Pass "GET  /modules/amenity-bookings (member)  => $($r.Count) bookings" } catch { Fail "GET  /modules/amenity-bookings" $_ }
}
if ($bk) {
  try { $r = Req PATCH "$b/modules/amenity-bookings/$($bk.id)/status" $aT @{ status="CONFIRMED" }; Pass "PATCH /modules/amenity-bookings/status    => $($r.status)" } catch { Fail "PATCH /modules/amenity-bookings/status" $_ }
}

# ─── Polls ────────────────────────────────────────────────────────────────────
$poll = $null
try {
  $closes = [DateTime]::UtcNow.AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $poll = Req POST "$b/modules/polls" $aT @{ question="Preferred gym timing?"; description="Vote for morning or evening"; closesAt=$closes; options=@("6-8 AM","6-8 PM","Both") }
  Pass "POST /modules/polls (admin)                => id=$($poll.id) options=$($poll.options.Count)"
} catch { Fail "POST /modules/polls" $_ }

try { $r = Req GET "$b/modules/polls" $mT; Pass "GET  /modules/polls (member)             => $($r.Count) polls" } catch { Fail "GET  /modules/polls" $_ }

if ($poll) {
  $optId = $poll.options[0].id
  try { $r = Req POST "$b/modules/polls/$($poll.id)/vote" $mT @{ optionId=$optId }; Pass "POST /modules/polls/:id/vote (member)    => optionId=$($r.optionId)" } catch { Fail "POST /modules/polls/:id/vote" $_ }
  try { $r = Req GET  "$b/modules/polls/$($poll.id)/results" $aT; Pass "GET  /modules/polls/:id/results (admin)  => totalVotes=$($r.totalVotes)" } catch { Fail "GET  /modules/polls/:id/results" $_ }
  try { $r = Req PATCH "$b/modules/polls/$($poll.id)/close" $aT; Pass "PATCH /modules/polls/:id/close (admin)   => isActive=$($r.isActive)" } catch { Fail "PATCH /modules/polls/:id/close" $_ }
}

# ─── Parking Slots ────────────────────────────────────────────────────────────
$slot = $null
try { $slot = Req POST "$b/modules/parking/slots" $aT @{ slotNumber="V-001"; type="VISITOR"; block="Main Gate" }; Pass "POST /modules/parking/slots (admin)      => id=$($slot.id) type=$($slot.type)" } catch { Fail "POST /modules/parking/slots" $_ }
try { $r = Req GET  "$b/modules/parking/slots" $gT; Pass "GET  /modules/parking/slots (guard)      => $($r.Count) slots" } catch { Fail "GET  /modules/parking/slots" $_ }

if ($slot) {
  try { $r = Req POST "$b/modules/parking/slots/$($slot.id)/allocate" $gT @{ vehicleNo="MH12ZZ0099"; purpose="VISITOR"; flatId=$fId }; Pass "POST /modules/parking/slots/allocate      => id=$($r.id) vehicle=$($r.vehicleNo)" } catch { Fail "POST /modules/parking/slots/allocate" $_ }
  try { $r = Req GET  "$b/modules/parking/allocations" $gT; Pass "GET  /modules/parking/allocations (guard) => $($r.Count) active allocations" } catch { Fail "GET  /modules/parking/allocations" $_ }
  try { $r = Req POST "$b/modules/parking/slots/$($slot.id)/release" $gT; Pass "POST /modules/parking/slots/release       => releasedAt=$($r.releasedAt -ne $null)" } catch { Fail "POST /modules/parking/slots/release" $_ }
}

Write-Host ""
Write-Host "--- New modules smoke test: $pass PASSED, $fail FAILED ---" -ForegroundColor $(if ($fail -eq 0) {"Cyan"} else {"Yellow"})
