#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Bounded loopback-only micro-burst check. It never uses the public hostname,
# never logs in and never writes business data. It validates protection and
# basic latency; it is deliberately not presented as a production load test.
BASE_URL="${KLA_BENCHMARK_BASE_URL:-http://127.0.0.1:8080}"
[[ "$BASE_URL" == "http://127.0.0.1:8080" ]] || { echo "Benchmark może działać wyłącznie przez lokalny nginx." >&2; exit 2; }

python3 - "$BASE_URL" <<'PY'
import concurrent.futures, json, os, re, subprocess, sys, time, urllib.error, urllib.request

base = sys.argv[1]
levels = (1, 4, 8, 16)
requests_per_level = 24

def read(path, fallback=""):
    try:
        with open(path, encoding="utf-8") as handle: return handle.read().strip()
    except OSError: return fallback

def metrics():
    mem = {}
    for line in read("/proc/meminfo").splitlines():
        if ":" in line:
            key, value = line.split(":", 1); mem[key] = int(value.strip().split()[0]) * 1024
    temperature = int(read("/sys/class/thermal/thermal_zone0/temp", "0") or 0) / 1000
    try: throttled = subprocess.check_output(["vcgencmd", "get_throttled"], text=True, timeout=2).strip()
    except Exception: throttled = "unknown"
    match = re.search(r"0x([0-9a-fA-F]+)", throttled)
    throttled_value = int(match.group(1), 16) if match else None
    return {"temperatureC": round(temperature, 1), "memAvailable": mem.get("MemAvailable", 0), "load": list(os.getloadavg()), "throttled": throttled,
            "currentPowerOrThermalLimit": bool(throttled_value is not None and throttled_value & 0xF)}

def request(path):
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(base + path, timeout=8) as response:
            response.read(4096); status = response.status
    except urllib.error.HTTPError as error: status = error.code
    except Exception: status = 0
    return status, (time.perf_counter() - started) * 1000

def percentile(values, rank):
    if not values: return None
    ordered = sorted(values)
    return round(ordered[min(len(ordered) - 1, max(0, int(len(ordered) * rank) - 1))], 1)

initial = metrics()
if initial["temperatureC"] >= 75 or initial["memAvailable"] < 512 * 1024 * 1024 or initial["currentPowerOrThermalLimit"]:
    raise SystemExit("Pomiar przerwany: serwer nie ma bezpiecznego zapasu temperatury, pamięci albo zasilania.")

paths = ["/", "/api/site-content", "/api/health"]
try:
    html = urllib.request.urlopen(base + "/", timeout=8).read(2_000_000).decode("utf-8", "ignore")
    match = re.search(r"(/_next/static/[^\"']+\.(?:js|css))", html)
    if match: paths.append(match.group(1))
except Exception: pass

results = []
stopped_reason = None
for concurrency in levels:
    before = metrics()
    if before["temperatureC"] >= 75 or before["memAvailable"] < 512 * 1024 * 1024 or before["currentPowerOrThermalLimit"]:
        stopped_reason = "hardware-threshold-before-level"
        break
    for path in paths:
        started = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            rows = list(pool.map(lambda _: request(path), range(requests_per_level)))
        elapsed = time.perf_counter() - started
        timings = [duration for status, duration in rows if 200 <= status < 400]
        status_counts = {str(status): sum(1 for row_status, _ in rows if row_status == status) for status in sorted({status for status, _ in rows})}
        throttled_count = sum(1 for status, _ in rows if status == 429)
        unexpected_errors = sum(1 for status, _ in rows if status == 0 or status >= 500 or (status >= 400 and status != 429))
        result = {"path": path, "concurrency": concurrency, "requests": len(rows), "unexpectedErrors": unexpected_errors,
                  "throttled": throttled_count, "statusCounts": status_counts,
                  "requestsPerSecond": round(len(rows) / max(elapsed, .001), 1),
                  "p50Ms": percentile(timings, .50), "p95Ms": percentile(timings, .95), "p99Ms": percentile(timings, .99)}
        results.append(result)
        after = metrics()
        if unexpected_errors / len(rows) > .01 or (result["p95Ms"] or 0) > 2000 or after["currentPowerOrThermalLimit"] or after["temperatureC"] >= 75 or after["memAvailable"] < 512 * 1024 * 1024:
            stopped_reason = "error-latency-or-hardware-threshold"
            break
    if stopped_reason:
        break

final = metrics()
print(json.dumps({"status": "stopped" if stopped_reason else "ok", "scope": "loopback-read-only-microburst", "reason": stopped_reason, "initial": initial, "results": results, "final": final}, ensure_ascii=False))
PY
