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
    } else {
      throw $_.Exception.Message
    }
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
$flats  = Req GET  "$b/admin/flats" $aT
$fId    = $flats[0].id
Write-Host "Setup OK | flatId=$fId  adminId=$($admin.user.id)  memberId=$($member.user.id)  guardId=$($grd.user.id)" -ForegroundColor Cyan

# 1
try { $r = Req GET "$b/advanced/residents" $aT; Pass "GET  /advanced/residents                  => $($r.Count) residents" } catch { Fail "GET  /advanced/residents" $_ }
# 2
try { $r = Req POST "$b/advanced/residents/verify" $gT @{ flatId = $fId; identifier = "member@society.local" }; Pass "POST /advanced/residents/verify            => verified=$($r.verified)" } catch { Fail "POST /advanced/residents/verify" $_ }
# 3
$d = $null
try { $d = Req POST "$b/advanced/deliveries" $gT @{ flatId = $fId; courierName = "Amazon"; packageType = "Box" }; Pass "POST /advanced/deliveries                  => id=$($d.id)" } catch { Fail "POST /advanced/deliveries" $_ }
# 4
try { $r = Req GET "$b/advanced/deliveries" $mT; Pass "GET  /advanced/deliveries (member)        => $($r.Count) items" } catch { Fail "GET  /advanced/deliveries" $_ }
# 5
if ($d) { try { $r = Req PATCH "$b/advanced/deliveries/$($d.id)/status" $gT @{ status = "ARRIVED" }; Pass "PATCH /advanced/deliveries/:id/status      => $($r.status)" } catch { Fail "PATCH /advanced/deliveries/:id/status" $_ } }
# 6
$v = $null
try { $v = Req POST "$b/advanced/vehicles" $mT @{ plateNumber = "KA88XY0001"; type = "Bike"; brand = "Yamaha"; color = "Red" }; Pass "POST /advanced/vehicles                    => id=$($v.id)" } catch { Fail "POST /advanced/vehicles" $_ }
# 7
try { $r = Req GET "$b/advanced/vehicles" $gT; Pass "GET  /advanced/vehicles (guard)           => $($r.Count) items" } catch { Fail "GET  /advanced/vehicles" $_ }
# 8
if ($v) { try { $r = Req PATCH "$b/advanced/vehicles/$($v.id)/status" $gT @{ status = "BLOCKED" }; Pass "PATCH /advanced/vehicles/:id/status        => $($r.status)" } catch { Fail "PATCH /advanced/vehicles/:id/status" $_ } }
# 9
$al = $null
try { $al = Req POST "$b/advanced/emergency-alerts" $mT @{ level = "CRITICAL"; message = "SOS smoke test" }; Pass "POST /advanced/emergency-alerts            => id=$($al.id) level=$($al.level)" } catch { Fail "POST /advanced/emergency-alerts" $_ }
# 10
try { $r = Req GET "$b/advanced/emergency-alerts" $gT; Pass "GET  /advanced/emergency-alerts (guard)   => $($r.Count) items" } catch { Fail "GET  /advanced/emergency-alerts" $_ }
# 11
if ($al) { try { $r = Req PATCH "$b/advanced/emergency-alerts/$($al.id)/acknowledge" $gT @{ status = "RESOLVED" }; Pass "PATCH /advanced/emergency-alerts/acknowledge=> $($r.status)" } catch { Fail "PATCH /advanced/emergency-alerts/acknowledge" $_ } }
# 12
$inv = $null
try { $inv = Req POST "$b/advanced/maintenance-invoices" $aT @{ flatId = $fId; amount = 2500; dueDate = "2026-07-01T00:00:00.000Z"; month = 7; year = 2026; notes = "Smoke" }; Pass "POST /advanced/maintenance-invoices        => id=$($inv.id) amount=$($inv.amount)" } catch { Fail "POST /advanced/maintenance-invoices" $_ }
# 13
try { $r = Req GET "$b/advanced/maintenance-invoices" $mT; Pass "GET  /advanced/maintenance-invoices (member)=> $($r.Count) items" } catch { Fail "GET  /advanced/maintenance-invoices" $_ }
# 14
if ($inv) { try { $r = Req POST "$b/advanced/maintenance-invoices/$($inv.id)/payments" $mT @{ amount = 2500; method = "UPI"; reference = "SMOKE-001" }; Pass "POST /advanced/maintenance-invoices/payments=> paidBy=$($r.paidBy.name)" } catch { Fail "POST /advanced/maintenance-invoices/payments" $_ } }
# 15
$c = $null
try { $c = Req POST "$b/advanced/complaints" $mT @{ category = "Lift"; subject = "Lift broken"; description = "Lift not working since yesterday morning" }; Pass "POST /advanced/complaints                  => id=$($c.id)" } catch { Fail "POST /advanced/complaints" $_ }
# 16
try { $r = Req GET "$b/advanced/complaints" $gT; Pass "GET  /advanced/complaints (guard)         => $($r.Count) items" } catch { Fail "GET  /advanced/complaints" $_ }
# 17
if ($c) { try { $r = Req PATCH "$b/advanced/complaints/$($c.id)/status" $aT @{ status = "RESOLVED" }; Pass "PATCH /advanced/complaints/:id/status      => $($r.status)" } catch { Fail "PATCH /advanced/complaints/:id/status" $_ } }
# 18
try { $r = Req POST "$b/advanced/announcements" $aT @{ title = "Fire Drill"; message = "Sunday 9am drill"; audienceRole = "MEMBER" }; Pass "POST /advanced/announcements               => id=$($r.id)" } catch { Fail "POST /advanced/announcements" $_ }
# 19
try { $r = Req GET "$b/advanced/announcements" $mT; Pass "GET  /advanced/announcements (member)     => $($r.Count) items" } catch { Fail "GET  /advanced/announcements" $_ }
# 20
try { $r = Req GET "$b/advanced/security/dashboard" $gT; Pass "GET  /advanced/security/dashboard         => visitors=$($r.activeVisitors) deliveries=$($r.expectedDeliveries) alerts=$($r.openEmergencyAlerts)" } catch { Fail "GET  /advanced/security/dashboard" $_ }
# 21
try { $r = Req GET "$b/advanced/analytics/overview" $aT; Pass "GET  /advanced/analytics/overview         => residents=$($r.residentCount) vehicles=$($r.activeVehicles) invoices=$($r.pendingInvoices)" } catch { Fail "GET  /advanced/analytics/overview" $_ }
# 22
try { $r = Req GET "$b/advanced/audit-logs" $aT; Pass "GET  /advanced/audit-logs                  => $($r.Count) log entries" } catch { Fail "GET  /advanced/audit-logs" $_ }

Write-Host ""
Write-Host "--- Smoke test complete: $pass PASSED, $fail FAILED ---" -ForegroundColor $(if ($fail -eq 0) {"Cyan"} else {"Yellow"})
