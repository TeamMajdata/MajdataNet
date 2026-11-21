#!/usr/bin/env bash
# 为 public/events 下的活动横幅生成 1280px 宽的 WebP 缩略图（public/events/thumb）。
# 新增活动图片后运行一次：pnpm events:thumbs（需要 ImageMagick 的 magick 命令）。
set -euo pipefail
cd "$(dirname "$0")/../public/events"
mkdir -p thumb
for f in *.png *.jpg *.jpeg *.webp; do
  [ -e "$f" ] || continue
  out="thumb/${f%.*}.webp"
  # 已有且比原图新时跳过
  if [ -e "$out" ] && [ "$out" -nt "$f" ]; then continue; fi
  magick "${f}[0]" -resize '1280x>' -strip -quality 80 "$out"
  echo "generated $out"
done
