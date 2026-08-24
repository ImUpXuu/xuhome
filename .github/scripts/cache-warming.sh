#!/usr/bin/env bash
set -u -o pipefail

BASE_URL="${BASE_URL:-https://upxuu.com}"
RUN_SECONDS="${RUN_SECONDS:-21480}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"
PARALLEL="${PARALLEL:-8}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-20}"

for variable_name in RUN_SECONDS INTERVAL_SECONDS PARALLEL REQUEST_TIMEOUT; do
  if [[ ! "${!variable_name}" =~ ^[0-9]+$ ]]; then
    echo "::error::${variable_name} 必须是非负整数"
    exit 1
  fi
done

warm_url() {
  local url="$1"
  local header_file
  local metric
  local http_code
  local response_time
  local remote_ip
  local cache_status
  local age_seconds

  header_file="$(mktemp)"
  metric="$(curl -sS -o /dev/null -m "$REQUEST_TIMEOUT" -D "$header_file" \
    -w '%{http_code}\t%{time_total}\t%{remote_ip}' "$url" 2>/dev/null || true)"
  IFS=$'\t' read -r http_code response_time remote_ip <<< "$metric"
  cache_status="$(awk '
    tolower($0) ~ /^x-vercel-cache:/ {
      value = $0
      sub(/^[^:]*:[[:space:]]*/, "", value)
      sub(/\r$/, "", value)
      print value
    }
  ' "$header_file" | tail -n 1)"
  if [ -z "$cache_status" ]; then
    cache_status="$(awk '
      tolower($0) ~ /^cf-cache-status:/ {
        value = $0
        sub(/^[^:]*:[[:space:]]*/, "", value)
        sub(/\r$/, "", value)
        print value
      }
    ' "$header_file" | tail -n 1)"
  fi
  age_seconds="$(awk '
    tolower($0) ~ /^age:/ {
      value = $0
      sub(/^[^:]*:[[:space:]]*/, "", value)
      sub(/\r$/, "", value)
      if (value ~ /^[0-9]+$/) print value
    }
  ' "$header_file" | tail -n 1)"

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$url" \
    "${http_code:-000}" \
    "${response_time:-0.000000}" \
    "${remote_ip:-unknown}" \
    "${cache_status:-NONE}" \
    "${age_seconds:-}"
  rm -f "$header_file"
}

deadline=$(( $(date +%s) + RUN_SECONDS ))
cycle=0

while [ "$(date +%s)" -lt "$deadline" ]; do
  cycle=$((cycle + 1))
  cycle_start="$(date +%s)"

  if curl -fsS --retry 2 --retry-delay 2 -m 30 "${BASE_URL}/sitemap.xml" \
    | grep -oP '(?<=<loc>)[^<]+' \
    | sed 's/\r$//' > urls.txt; then
    printf '%s\n' \
      "${BASE_URL}/bot/" \
      "${BASE_URL}/bot/posts/" \
      "${BASE_URL}/bot/talks/" >> urls.txt

    grep -oP 'https?://[^/\s?#]+/posts/[^/\s?#]+' urls.txt \
      | sed 's|/posts/|/bot/|; s|$|/|' >> urls.txt
    grep -oP 'https?://[^/\s?#]+/talk/[^/\s?#]+' urls.txt \
      | sed 's|/talk/|/bot/talk/|; s|$|/|' >> urls.txt
    sort -u urls.txt -o urls.txt
    url_count=$(wc -l < urls.txt)

    metrics_file="$(mktemp)"
    export -f warm_url
    export REQUEST_TIMEOUT
    xargs -P "$PARALLEL" -I {} bash -c 'warm_url "$@"' _ {} \
      < urls.txt > "$metrics_file" || true

    summary="$(awk -F '\t' '
      {
        total++
        code=$2 + 0
        if (code >= 200 && code < 400) successful++
        response_sum += $3 + 0
        ip=($4 == "" ? "unknown" : $4)
        status=($5 == "" ? "NONE" : $5)
        if (status == "HIT") hits++
        if ($6 ~ /^[0-9]+$/) {
          age = $6 + 0
          age_total += age
          age_count++
          if (!age_seen || age < age_min) age_min = age
          if (!age_seen || age > age_max) age_max = age
          age_seen = 1
        }
      }
      END {
        average=total ? response_sum / total : 0
        hit_rate=total ? hits * 100 / total : 0
        age_average=age_count ? age_total / age_count : 0
        if (age_count)
          printf "%d\t%d\t%.3f\t%d\t%.1f\t%.0f\t%d\t%d", total, successful, average, hits, hit_rate, age_average, age_min, age_max
        else
          printf "%d\t%d\t%.3f\t%d\t%.1f\t-1\t-1\t-1", total, successful, average, hits, hit_rate
      }' "$metrics_file")"
    IFS=$'\t' read -r requested successful average_response hits hit_rate age_average age_min age_max <<< "$summary"

    ip_summary="$(awk -F '\t' '{print ($4 == "" ? "unknown" : $4)}' "$metrics_file" \
      | sort | uniq -c \
      | awk '{printf "%s%s(%s)", separator, $2, $1; separator=", "}')"
    status_summary="$(awk -F '\t' '{print ($5 == "" ? "NONE" : $5)}' "$metrics_file" \
      | sort | uniq -c \
      | awk '{printf "%s%s=%s", separator, $2, $1; separator=", "}')"

    elapsed=$(($(date +%s) - cycle_start))
    if [ "$age_average" -ge 0 ]; then
      age_summary="avg=${age_average%.*}s/min=${age_min}s/max=${age_max}s"
    else
      age_summary="N/A"
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 第 $cycle 轮：预热 $requested 个页面，用时 ${elapsed}s，成功 $successful/$requested，平均响应 ${average_response}s，IP ${ip_summary:-unknown}，状态 ${status_summary:-NONE}，命中 HIT ${hits}/${requested}(${hit_rate}%)，Age ${age_summary}"
    rm -f "$metrics_file"
  else
    echo "::warning::[$(date '+%Y-%m-%d %H:%M:%S')] 获取 sitemap 失败，本轮跳过"
  fi

  next_cycle=$(( cycle_start + INTERVAL_SECONDS ))
  now="$(date +%s)"
  if [ "$now" -lt "$next_cycle" ] && [ "$next_cycle" -lt "$deadline" ]; then
    sleep $(( next_cycle - now ))
  elif [ "$next_cycle" -lt "$deadline" ]; then
    sleep 5
  fi
done

echo "保温窗口结束：共执行 $cycle 轮"
